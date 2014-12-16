angular.module('bhima.controllers')
.controller('receipt.sale', [
  '$scope',
  '$routeParams',
  '$q',
  '$http',
  'validate',
  'exchange',
  'appstate',
  'util',
  'connect',
  'messenger',
  function ($scope, $routeParams, $q, $http, validate, exchange, appstate, util, connect, messenger) {
    var dependencies = {}, model = $scope.model = {common : {}};

    function processSale(invoiceId) {
      dependencies.recipient = {
        required: true
      };

      dependencies.invoice = {
        required: true,
        query: {
          tables: {
            'sale' : {
              columns: ['uuid', 'cost', 'currency_id', 'debitor_uuid', 'seller_id', 'invoice_date', 'note', 'project_id', 'reference']
            },
            'project' : {
              columns : ['abbr']
            }
          },
          join : ['sale.project_id=project.id'],
          where: ['sale.uuid=' + invoiceId]
        }
      };

      dependencies.invoiceItem = {
        required: true,
        query: {
          tables: {
            inventory : {
              columns: ['uuid', 'code', 'text']
            },
            sale_item : {
              columns: ['uuid', 'quantity', 'debit', 'credit', 'transaction_price', 'sale_uuid']
            }
          },
          join: ['sale_item.inventory_uuid=inventory.uuid'],
          where: ['sale_item.sale_uuid=' + invoiceId]
        }
      };

      dependencies.currency = {
        query : {
          tables : {
            'currency' : {
              columns : ['id', 'symbol']
            }
          }
        }
      };

      dependencies.ledger = {
        identifier: 'inv_po_id'
      };

      dependencies.location = {
        required: true
      };

      return validate.process(dependencies, ['invoice', 'invoiceItem'])
      .then(buildRecipientQuery);
    }

    function buildRecipientQuery(model) {
      var invoiceData = model.invoice.data[0];

      dependencies.recipient.query = {
        tables: {
          'patient' : {
            columns: ['first_name', 'last_name', 'dob', 'current_location_id', 'reference', 'registration_date']
          },
          'project' : {
            columns: ['abbr']
          },
          'debitor' : {
            columns: ['text']
          },
          'debitor_group' : {
            columns : ['name', 'is_convention'],
          }
        },
        where: [
          'patient.debitor_uuid=' + invoiceData.debitor_uuid,
        ],
        join : [
          'patient.project_id=project.id',
          'patient.debitor_uuid=debitor.uuid',
          'debitor.group_uuid=debitor_group.uuid'
        ]
      };

      dependencies.ledger.query = 'ledgers/debitor/' + invoiceData.debitor_uuid;
      return validate.process(dependencies, ['recipient'])
      .then(buildLocationQuery);
    }

    function buildLocationQuery(model) {
      var recipientData = model.recipient.data[0];

      dependencies.location.query = 'location/detail/' + recipientData.current_location_id;
      return validate.process(dependencies).then(invoice);
    }

    function invoice(invoiceModel) {
      //Expose data to template
      model.sale = { allData : invoiceModel, invoice : {}, recipient : {} };
      model.sale.currentCurrency = model.sale.allData.currency.get(model.common.enterprise.currency_id);

      //Default sale receipt should only contain one invoice record - kind of a hack for multi-invoice cash payments
      model.sale.invoice = model.sale.allData.invoice.data[model.sale.allData.invoice.data.length-1];
      model.sale.invoice.totalSum = model.sale.allData.invoice.data.reduce(sum, 0) || 0;
      model.sale.invoice.ledger = model.sale.allData.ledger.get(model.sale.invoice.uuid);

      model.sale.recipient = model.sale.allData.recipient.data[0];
      model.sale.recipient.location = model.sale.allData.location.data[0];
      
      // Human readable ID
      model.sale.recipient.hr_id = model.sale.recipient.abbr.concat(model.sale.recipient.reference);
      model.sale.invoice.hr_id = model.sale.invoice.abbr.concat(model.sale.invoice.reference);

      updateCost(model.sale.currentCurrency.currency_id);
    }

    function sum (a,b) { return a + b.cost; }

    function updateCost(currency_id) {
      model.sale.invoice.localeCost = exchange(model.sale.invoice.cost, currency_id, model.sale.invoice.invoice_date);
      if (model.sale.invoice.ledger)  {
        model.sale.invoice.localeBalance = exchange(model.sale.invoice.ledger.balance, currency_id, model.sale.invoice.invoice_date);
        model.sale.invoice.ledger.localeCredit = exchange(model.sale.invoice.ledger.credit, currency_id, model.sale.invoice.invoice_date);
      }

      model.sale.invoice.localeTotalSum = exchange(model.sale.invoice.totalSum, currency_id, model.sale.invoice.invoice_date);

      model.sale.allData.invoiceItem.data.forEach(function (item) {
        item.localeTransaction = exchange(item.transaction_price, currency_id, model.sale.invoice.invoice_date);
        item.localeCost = exchange((item.credit - item.debit), currency_id, model.sale.invoice.invoice_date);
      });
    }

  	appstate.register('receipts.commonData', function (commonData) {
  		commonData.then(function (values) {
        model.common.location = values.location.data.pop();
        model.common.enterprise = values.enterprise.data.pop();
        processSale(values.invoiceId)
        .catch(function (err){
          messenger.danger('error', err);
        });
  		});     
    });    
  }
]);