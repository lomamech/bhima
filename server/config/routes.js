/**
* Application Routing
*
* Initialise link between server paths and controller logic
*
* TODO Pass authenticate and authorize middleware down through
* controllers, allowing for modules to subscribe to different
* levels of authority
*
* TODO createPurchase, createSale, are all almost
* identicale modules - they should all be encapsulated as one
* module. For Example finance.createSale, finance.createPurchase
*/
var auth            = require('../controllers/auth');
var data            = require('../controllers/data');
var users           = require('../controllers/users');
var locations       = require('../controllers/location');
var tree            = require('../controllers/tree');

var createPurchase  = require('../controllers/finance/purchase');
var createSale      = require('../controllers/finance/sale');

var patient         = require('../controllers/medical/patient');
var snis            = require('../controllers/medical/snis');
var projects        = require('../controllers/medical/projects');

var legacyReports   = require('../controllers/reports/report_legacy');
var reports         = require('../controllers/reports/reports.js');

var inventory       = require('../controllers/stock/inventory');
var depot           = require('../controllers/stock/depot');
var consumptionLoss = require('../controllers/stock/inventory/depreciate/consumptionLoss');

var trialbalance   = require('../controllers/finance/trialbalance');
var journal        = require('../controllers/finance/journal');
var ledger         = require('../controllers/finance/ledger');
var fiscal         = require('../controllers/finance/fiscal');
var extra          = require('../controllers/finance/extraPayment');
var gl             = require('../controllers/finance/ledgers/general');
var genericFinance = require('../controllers/finance/financeGeneric');
var accounts       = require('../controllers/finance/accounts');
var analytics      = require('../controllers/finance/analytics');
var purchase       = require('../controllers/finance/purchase');
var budget         = require('../controllers/finance/budget');
var taxPayment     = require('../controllers/finance/taxPayment');
var donations      = require('../controllers/finance/donations');
var debtors        = require('../controllers/finance/debtors');
var cashboxes      = require('../controllers/finance/cashboxes');
var exchange       = require('../controllers/finance/exchange');
var cashflow       = require('../controllers/cashflow');


var financeServices      = require('../controllers/categorised/financeServices');
var depreciatedInventory = require('../controllers/categorised/inventory_depreciate');
var depreciatedReports   = require('../controllers/categorised/reports_depreciate');
var payroll              = require('../controllers/categorised/payroll');
var caution              = require('../controllers/categorised/caution');
var employees            = require('../controllers/categorised/employees');
var subsidies            = require('../controllers/categorised/subsidies');
var units                = require('../controllers/units');

// Middleware for handle uploaded file
var multipart       = require('connect-multiparty');

exports.configure = function (app) {
  console.log('[config/routes] Configure routes');

  // exposed to the outside without authentication
  app.get('/languages', users.getLanguages);
  app.get('/projects', projects.list);

  app.get('/units', units.list);

  app.post('/login', auth.login);
  app.get('/logout', auth.logout);

  app.get('/exchange', exchange.list);
  app.post('/exchange', exchange.create);

  // application data
  app.post('/data', data.create);
  app.get('/data', data.read);
  app.put('/data', data.update);
  app.delete('/data/:table/:column/:value', data.deleteRecord);

  // location routes
  // -> /location/:scope(list || lookup)/:target(village || sector || province)/:id(optional)
  app.get('/location/villages', locations.allVillages);
  app.get('/location/sectors', locations.allSectors);
  app.get('/location/provinces', locations.allProvinces);
  app.get('/location/village/:uuid', locations.lookupVillage);
  app.get('/location/sector/:uuid', locations.lookupSector);
  app.get('/location/province/:uuid', locations.lookupProvince);
  app.get('/location/detail/:uuid', locations.lookupDetail);

  // -> Add :route
  app.post('/report/build/:route', reports.build);
  app.get('/report/serve/:target', reports.serve);

  app.post('/purchase', createPurchase.execute);
  app.post('/sale/', createSale.execute);
  app.post('/consumption_loss/', consumptionLoss.execute);

  // trial balance routes
  app.post('/journal/trialbalance', trialbalance.postTrialBalance);
  app.post('/journal/togeneralledger', trialbalance.postToGeneralLedger); // TODO : rename?

  app.get('/journal/:table/:id', journal.lookupTable);

  // TODO Transition to journal API (this route should be /journal)
  app.get('/journal_list/', journal.transactions);


  // ledger routes
  // TODO : needs renaming
  app.get('/ledgers/debitor/:id', ledger.compileDebtorLedger);
  app.get('/ledgers/debitor_group/:id', ledger.compileGroupLedger);
  app.get('/ledgers/employee_invoice/:id', ledger.compileEmployeeLedger);
  app.get('/ledgers/distributableSale/:id', ledger.compileSaleLedger);
  app.get('/ledgers/debitor_sale/:id/:saleId', ledger.compileDebtorLedgerSale);

  /* fiscal year controller */

  app.get('/fiscal', fiscal.getFiscalYears);
  app.post('/fiscal/create', fiscal.createFiscalYear);

  app.get('/reports/:route/', legacyReports.buildReport);

  app.get('/tree', tree.generate);

  // snis controller
  app.get('/snis/getAllReports', snis.getAllReports);
  app.get('/snis/getReport/:id', snis.getReport);
  app.post('/snis/createReport', snis.createReport);
  app.delete('/snis/deleteReport/:id', snis.deleteReport);
  app.post('/snis/populateReport', snis.populateReport);

  /**
   * refactor-categorisation
   *
   * @todo test all routes below to ensure no broken links
   */

  // Financial services - cost/ profit centers, services etc.
  app.get('/services/', financeServices.listServices);
  app.get('/available_cost_center/', financeServices.availableCostCenters);
  app.get('/available_profit_center/', financeServices.availableProfitCenters);
  app.get('/cost/:id_project/:cc_id', financeServices.costCenterCost);
  app.get('/profit/:id_project/:pc_id', financeServices.profitCenterCost);
  app.get('/costCenterAccount/:id_enterprise/:cost_center_id', financeServices.costCenterAccount);
  app.get('/profitCenterAccount/:id_enterprise/:profit_center_id', financeServices.profitCenterAccount);
  app.get('/removeFromCostCenter/:tab', financeServices.removeFromCostCenter);
  app.get('/removeFromProfitCenter/:tab', financeServices.removeFromProfitCenter);
  app.get('/auxiliairyCenterAccount/:id_enterprise/:auxiliairy_center_id', financeServices.auxCenterAccount);

  // DEPRECIATED Inventory routes - these should be removed as soon as possible
  // FIXME Depreciate routes
  app.get('/lot/:inventory_uuid', depreciatedInventory.getInventoryLot);
  app.get('/stockIn/:depot_uuid/:df/:dt', depreciatedInventory.stockIn);
  app.get('/inv_in_depot/:depot_uuid', depreciatedInventory.inventoryByDepot);
  app.get('/getExpiredTimes/', depreciatedInventory.listExpiredTimes);
  app.get('/getStockEntry/', depreciatedInventory.listStockEntry);
  app.get('/getStockConsumption/', depreciatedInventory.listStockConsumption);
  app.get('/monthlyConsumptions/:inventory_uuid/:nb', depreciatedInventory.listMonthlyConsumption);
  app.get('/getConsumptionTrackingNumber/', depreciatedInventory.listConsumptionByTrackingNumber);
  app.get('/getMonthsBeforeExpiration/:id', depreciatedInventory.formatLotsForExpiration);
  app.get('/stockIntegration/', depreciatedInventory.getStockIntegration);

  // Employee management
  app.get('/employee_list/', employees.list);
  app.get('/hollyday_list/:pp/:employee_id', employees.listHolidays);
  app.get('/getCheckHollyday/', employees.checkHoliday);
  app.get('/getCheckOffday/', employees.checkOffday);

  app.get('/caution/:debitor_uuid/:project_id', caution.debtor);

  app.get('/getAccount6', accounts.listIncomeAccounts);
  app.get('/getAccount7/', accounts.listExpenseAccounts);
  app.get('/getClassSolde/:account_class/:fiscal_year', accounts.getClassSolde);
  app.get('/getTypeSolde/:fiscal_year/:account_type_id/:is_charge', accounts.getTypeSolde);


  app.get('available_payment_period/', taxPayment.availablePaymentPeriod);
  app.post('/payTax/', taxPayment.submit);
  app.put('/setTaxPayment/', taxPayment.setTaxPayment);

  app.get('/cost_periodic/:id_project/:cc_id/:start/:end', financeServices.costByPeriod);
  app.get('/profit_periodic/:id_project/:pc_id/:start/:end', financeServices.profitByPeriod);

  // TODO Remove or upgrade (model in database) every report from report_depreciate
  app.get('/getDistinctInventories/', depreciatedReports.listDistinctInventory);
  app.get('/getReportPayroll/', depreciatedReports.buildPayrollReport);

  // Payroll
  app.get('/getDataPaiement/', payroll.listPaiementData);
  app.get('/getEmployeePayment/:id', payroll.listPaymentByEmployee);
  app.get('/getEnterprisePayment/:employee_id', payroll.listPaymentByEnterprise);
  app.post('/payCotisation/', payroll.payCotisation);
  app.post('/posting_promesse_payment/', payroll.payPromesse);
  app.post('/posting_promesse_cotisation/', payroll.payPromesseCotisation);
  app.post('/posting_promesse_tax/', payroll.payPromesseTax);
  app.put('/setCotisationPayment/', payroll.setCotisationPayment);
  app.get('/getEmployeeCotisationPayment/:id', payroll.listEmployeeCotisationPayments);
  app.get('/taxe_ipr_currency/', payroll.listTaxCurrency);

  app.post('/posting_donation/', donations.post);

  app.get('/getSubsidies/', subsidies.list);

  /*  Inventory and Stock Managment */
  app.get('/inventory/metadata', inventory.getInventoryItems);
  app.get('/inventory/:uuid/metadata', inventory.getInventoryItemsById);

  app.get('/inventory/consumption', inventory.getInventoryConsumption);
  app.get('/inventory/:uuid/consumption', inventory.getInventoryConsumptionById);

  app.get('/inventory/leadtimes', inventory.getInventoryLeadTimes);
  app.get('/inventory/:uuid/leadtimes', inventory.getInventoryLeadTimesById);

  app.get('/inventory/stock', inventory.getInventoryStockLevels);
  app.get('/inventory/:uuid/stock', inventory.getInventoryStockLevelsById);

  app.get('/inventory/expirations', inventory.getInventoryExpirations);
  app.get('/inventory/:uuid/expirations', inventory.getInventoryExpirationsById);

  app.get('/inventory/lots', inventory.getInventoryLots);
  app.get('/inventory/:uuid/lots', inventory.getInventoryLotsById);

  app.get('/inventory/status', inventory.getInventoryStatus);
  app.get('/inventory/:uuid/status', inventory.getInventoryStatusById);

  app.get('/inventory/donations', inventory.getInventoryDonations);
  app.get('/inventory/:uuid/donations', inventory.getInventoryDonationsById);

  /* Depot Management */

  app.get('/depots', depot.getDepots);
  app.get('/depots/:uuid', depot.getDepotsById);

  app.get('/depots/:depotId/distributions', depot.getDistributions);
  app.get('/depots/:depotId/distributions/:uuid', depot.getDistributionsById);

  // over-loaded distributions route handles patients, services, and more
  app.post('/depots/:depotId/distributions', depot.createDistributions);

  // get the lots of a particular inventory item in the depot
  // TODO -- should this be renamed? /stock? /lots?
  app.get('/depots/:depotId/inventory', depot.getAvailableLots);
  app.get('/depots/:depotId/inventory/:uuid', depot.getAvailableLotsByInventoryId);

  app.get('/depots/:depotId/expired', depot.getExpiredLots);
  app.get('/depots/:depotId/expirations', depot.getStockExpirations);

  /* continuing on ... */

  // stock API
  app.get('/donations', donations.getRecentDonations);

  // TODO - make a purchase order controller
  app.get('/purchaseorders', purchase.getPurchaseOrders);

  app.post('/posting_fiscal_resultat/', fiscal.fiscalYearResultat);

  // Extra Payement
  app.post('/extraPayment/', extra.handleExtraPayment);

  // general ledger controller
  // transitioning to a more traditional angular application architecture
  app.get('/ledgers/general', gl.route);

  // finance controller
  app.get('/finance/debtors', genericFinance.getDebtors);
  app.get('/finance/creditors', genericFinance.getCreditors);
  app.get('/finance/currencies', genericFinance.getCurrencies);
  app.get('/finance/profitcenters', genericFinance.getProfitCenters);
  app.get('/finance/costcenters', genericFinance.getCostCenters);
  app.post('/finance/journalvoucher', genericFinance.postJournalVoucher);

  // accounts controller
  app.get('/accounts', accounts.list);
  app.get('/InExAccounts/:id_enterprise/', accounts.listInExAccounts);
  app.get('/availableAccounts/:id_enterprise/', accounts.listEnterpriseAccounts);
  app.get('/availableAccounts_profit/:id_enterprise/', accounts.listEnterpriseProfitAccounts);

  // Patients API
  app.get('/patients', patient.list);
  app.post('/patients', patient.create);
  app.put('/patients/:uuid', patient.update);

  app.get('/patients/groups', patient.listGroups);
  app.get('/patients/:uuid', patient.details);

  app.get('/patients/:uuid/groups', patient.groups);
  app.post('/patients/:uuid/groups', patient.updateGroups);

  app.get('/patients/checkHospitalId/:id', patient.verifyHospitalNumber);
  app.post('/patients/visit', patient.visit);

  // app.get('/patients/search', patient.search);
  app.get('/patients/search/name/:value', patient.searchFuzzy);
  app.get('/patients/search/reference/:value', patient.searchReference);

  // Debtors API
  // app.get('/debtors', debtors.list);
  app.get('/debtors/groups', debtors.listGroups);
  app.get('/debtors/groups/:uuid', debtors.groupDetails);
  // app.get('/debtors/:uuid', debtors.details);
  app.get('/debtors/:uuid/invoices', debtors.invoices);

  app.put('/debtors/:uuid', debtors.update);

  // search stuff
  // TODO merge with patients API
  app.get('/patient/:uuid', patient.details);
  app.get('/patient/search/fuzzy/:match', patient.searchFuzzy);
  app.get('/patient/search/reference/:reference', patient.searchReference);

  // analytics for financial dashboard
  // cash flow analytics
  app.get('/analytics/cashboxes', analytics.cashflow.getCashBoxes);
  app.get('/analytics/cashboxes/:id/balance', analytics.cashflow.getCashBoxBalance);
  app.get('/analytics/cashboxes/:id/history', analytics.cashflow.getCashBoxHistory);

  // debtor analytics
  app.get('/analytics/debtorgroups/top', analytics.cashflow.getTopDebtorGroups);
  app.get('/analytics/debtors/top', analytics.cashflow.getTopDebtors);

  // users controller
  app.get('/users', users.list);
  app.get('/users/:id', users.details);
  app.get('/users/:id/projects', users.projects.list);
  app.get('/users/:id/permissions', users.permissions.list);
  app.post('/users', users.create);
  app.post('/users/:id/permissions', users.permissions.assign);
  app.put('/users/:id', users.update);
  app.put('/users/:id/password', users.password);
  app.delete('/users/:id', users.delete);
  app.get('/editsession/authenticate/:pin', users.authenticatePin);

  // budget controller
  app.post('/budget/upload', multipart({ uploadDir: 'client/upload'}), budget.upload);
  app.post('/budget/update', budget.update);

  // projects controller
  app.get('/projects/:id', projects.details);
  app.put('/projects/:id', projects.update);
  app.post('/projects', projects.create);
  app.delete('/projects/:id', projects.delete);

  // cashbox controller
  app.get('/cashboxes', cashboxes.list);
  app.get('/cashboxes/:id', cashboxes.details);
  app.post('/cashboxes', cashboxes.create);
  app.put('/cashboxes/:id', cashboxes.update);
  app.delete('/cashboxes/:id', cashboxes.delete);

  // cashbox currencies
  app.get('/cashboxes/:id/currencies', cashboxes.currencies.list);
  app.get('/cashboxes/:id/currencies/:currencyId', cashboxes.currencies.details);
  app.post('/cashboxes/:id/currencies', cashboxes.currencies.create);
  app.put('/cashboxes/:id/currencies/:currencyId', cashboxes.currencies.update);

  // @todo - classify these
  app.get('/cashflow/report/', cashflow.getReport);
  //app.get('/stock/entries?', depot.getStockEntry);
};
