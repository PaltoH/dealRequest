sap.ui.define([
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/core/Core",
	"sap/m/MessageBox"

], function (Fragment, Filter,Core, MessageBox) {
	"use strict";

	return sap.ui.controller("deal.ext.controller.ObjectPageExt", {

		/**
		 * Controller's "init" lifecycle method.
		 * @public
		 */
		onInit: function () {
			var oAddButton = Core.byId("counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idItems::action::");
			oAddButton.attachPress(this.onShowSelectDialog, this);
			
			var oTableCand = Core.byId("counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idItems::Table");
			oTableCand.setRequestAtLeastFields(["CntrDealRequestRecordItemUuid", "CounterDealRequestItemUUID"]);
			oTableCand.setUseExportToExcel(true);
			
			var oModel = this.getOwnerComponent().getModel();
			oModel.attachBatchRequestCompleted(this._batchRequestCompletedController, this)
		
		},
		

		
		/**
		 * Returns view context.
		 * @private
		 * @return view context.
		 */
		_getViewContext: function () {
			return this.getView().getBindingContext();
		},
		
	    /**
	     * Returns table with transaction list.
		 * @private
		 * @return table object.
		 */
		_getTransactionsTable: function () {
			return Core.byId("counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idItems::responsiveTable");
		},
		
	
		/**
		 * Update info in transactions facet.
		 * @private
		 */
		_refreshTransactionsFacet: function () {
			this.extensionAPI.refresh(
				"counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idItems::responsiveTable"
			);
		},
		
		/**
		 * Event handler for Add button.
		 * @public
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		onShowSelectDialog: function (oEvent) {
			var	oView = this.getView();
			
			if (!this._oDialog) {
				this._oDialog = Fragment.load({
					id: oView.getId(),
					name: "counterdeal.ext.Fragments.TableSelect",
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					var oTableSelectTable = this.oTableSelectTable = Core.byId("counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idTableSelectDialog-table");
					var sNewBindingPath = "/CounterDealCandidates(P_CounterDealRequestUUID=guid'" + oView.getBindingContext().getObject("CounterDealRequestUUID") + "')/Set";
					oTableSelectTable.bindAggregation("items", sNewBindingPath, new sap.m.ColumnListItem({
						cells: [
							new sap.m.Text({
								text:"{CandidateDCSDeal}"
							}),
							new sap.m.Text({
								text: {
									parts: [
										{path: 'CandidateQuantity'},
										{path: 'CandidateQuantityUnit'}
									]
								}
							}),
							new sap.m.Text({
								text:"{CandidateCounterparty}"
							}),
							new sap.m.Text({
								text: {
									path: 'CandidateContractStartDate',
									type: 'sap.ui.model.type.Date',
									formatOptions: {
										pattern: 'dd.MM.yyyy'
									}
								}
							})
						]
					}));
					return oDialog;
				}.bind(this));
			}
			
			this._oDialog.then(function (oDialog){
				oDialog.open();
				if (!this.oTableSelectHeaderContent) {
					var oTableSelect = Core.byId("counterdeal::sap.suite.ui.generic.template.ObjectPage.view.Details::CounterDealRequest--idTableSelectDialog-dialog");
					this.oTableSelectHeaderContent = Fragment.load({
						id: oView.getId(),
						name: "counterdeal.ext.Fragments.SubHeader",
						controller: this
					}).then(function(oSubHeader){
						var oTableSelectContent = oTableSelect.getContent();
						oTableSelect.removeAllContent();
						oTableSelectContent.push(oSubHeader);
						oTableSelect.addContent(oTableSelectContent[0]);
						oTableSelect.addContent(oTableSelectContent[2]);
						oTableSelect.addContent(oTableSelectContent[1]);
						return oSubHeader;
					});
				}
			}.bind(this));
			
			if (this.oTableSelectTable) {
				this.oTableSelectTable.getModel().refresh();
			}
		},
		
		/**
		 * Event handler for Add button in table select.
		 * @public
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		onAdd: function (oEvent) {
			var oCtx = this._getViewContext();
			var oODataModel = this.getView().getModel();
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				for (var i = 0; i < aContexts.length; i++) {
					var oDrCand = aContexts[i].getObject();
					var sUrl = "/CounterDealRequest(CounterDealRequestUUID=guid'{UUIDNumber}',IsActiveEntity={bIsActive})/to_DealItem";
					var sUUIDNumber = oCtx.getObject("CounterDealRequestUUID");
					var bIsActive = oCtx.getObject("IsActiveEntity");
					var sDealItemIntSequenceNumber = this._getTransactionsTable().getItems().length + 1 + i + "";
					
					oODataModel.create(sUrl.replace("{UUIDNumber}", sUUIDNumber).replace("{bIsActive}", bIsActive), {
							CandidateContractStartDate: oDrCand.CandidateContractStartDate,
							CandidateDCSDeal: oDrCand.CandidateDCSDeal,
							CandidateQuantity: oDrCand.CandidateQuantity,
							CandidateQuantityUnit: oDrCand.CandidateQuantityUnit,
							CandidateCounterparty: oDrCand.CandidateCounterparty,
							CntrDealRequestRecordItemUUID: oDrCand.CandidateUUID,
					}, {
							success: function(result){
								this._refreshTransactionsFacet();
								this.nInitialItemsLength = this.nInitialItemsLength + 1;
							}.bind(this)
					});
					
				}
			}
		},
		
		/**
		 * Event handler for search input in table select.
		 * @public
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		onSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var oBinding = oEvent.getParameter("itemsBinding");
			var aSearchFilters = [];
			
			if (sValue) {
				if (isNaN(sValue) && sValue) {
					aSearchFilters.push(new Filter("CandidateDcsDeal", "Contains", sValue));
					aSearchFilters.push(new Filter("CandidateCounterparty", "Contains", sValue));
				} else if (!isNaN(sValue) && sValue) {
					aSearchFilters.push(new Filter("CandidateQuantity", "EQ", +sValue));
					aSearchFilters.push(new Filter("CandidateDcsDeal", "Contains", sValue));
					aSearchFilters.push(new Filter("CandidateCounterparty", "Contains", sValue));
				}
			}
			oBinding.filter(new Filter(aSearchFilters, false));
		},
		
		

		
	});
});