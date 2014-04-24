angular.module('kpk.controllers')
.controller('primaryCash.expense', [
  '$scope',
  '$routeParams',
  'validate',
  'messenger',
  'appstate',
  'connect',
  'uuid',
  'util',
  function ($scope, $routeParams, validate, messenger, appstate, connect, uuid, util) {
    var dependencies = {};
    var session = $scope.session = { receipt : {} };

    // TODO
    if (Number.isNaN(Number($routeParams.id))) {
      throw new Error('No cashbox selected');
    }

    var isDefined = angular.isDefined;

    $scope.timestamp = new Date();

    session.today = $scope.timestamp.toISOString().slice(0, 10);

    dependencies.suppliers = {
      query : {
        tables : {
          'supplier' : {
            columns : ['uuid', 'creditor_uuid', 'name', 'address_1', 'address_2', 'location_id', 'email']
          },
          'creditor' : {
            columns : ['text']
          },
          'creditor_group' : {
            columns : ['account_id']
          }
        },
        join : ['supplier.creditor_uuid=creditor.uuid', 'creditor.group_uuid=creditor_group.uuid']
      }
    };

    dependencies.currencies = {
      query : {
        tables : {
          'currency' : {
            columns : ['id', 'name', 'symbol']
          }
        }
      }
    };

    appstate.register('project', function (project) {
      $scope.project =  project;
      validate.process(dependencies)
      .then(function (models) {
        angular.extend($scope, models);
        session.receipt.date = new Date().toisostring().slice(0, 10);
        session.receipt.cost = 0.00;
        session.receipt.cash_box_id = $routeParams.id;
      })
      .catch(function (err) {
        messenger.error(err);
      });
    });

    function formatDates () {
      session.receipt.date = util.convertToMysqlDate(session.receipt.date);
    }

    $scope.generate = function generate () {
      session.receipt.reference_uuid = uuid();
    };

    $scope.clear = function clear () {
      session.receipt = {};
      session.receipt.date = new Date().toISOString().slice(0, 10);
      session.receipt.value = 0.00;
      session.receipt.cash_box_id = $routeParams.id;
    };

    $scope.$watch('session.receipt', function () {
      if (!session || !session.receipt) {
        session.invalid = true;
        return;
      }
      var r = session.receipt;

      session.invalid = !(isDefined(session.currency) &&
        isDefined(r.recipient) &&
        isDefined(r.cost) &&
        r.cost !== 0 &&
        isDefined(r.description) &&
        isDefined(r.date) &&
        isDefined(r.cash_box_id));
    }, true);

    $scope.submit = function submit () {
      var data, receipt = session.receipt;
      formatDates();


      connect.fetch('/user_session')
      .then(function (user) {

        data = {
          uuid          : uuid(),
          reference     : 1,
          project_id    : $scope.project.id,
          type          : 'E',
          date          : receipt.date,
          deb_cred_uuid : receipt.recipient.creditor_uuid,
          deb_cred_type : 'C',
          currency_id   : session.currency.id,
          cost          : receipt.cost,
          user_id       : user.data.id,
          description   : receipt.description + ' ID       : ' + receipt.reference_uuid,
          cash_box_id   : receipt.cash_box_id,
          origin_id     : 0
        };

        return connect.basicPut('primary_cash', [data]);
      })
      .then(function () {
        var item = {
          uuid              : uuid(),
          primary_cash_uuid : data.uuid,
          debit             : 0,
          credit            : data.cost,
          document_uuid     : receipt.reference_uuid
        };
        return connect.basicPut('primary_cash_item', [item]);
      })
      .then(function () {
        messenger.success("Posted data successfully.");
        session = $scope.session = { receipt : {} };
        session.receipt.date = new Date().toISOString().slice(0, 10);
        session.receipt.cost = 0.00;
        session.receipt.cash_box_id = $routeParams.id;
      })
      .catch(function (err) {
        messenger.error(err);
      });
    };
  }
]);
