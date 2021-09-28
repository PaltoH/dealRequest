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
			var oAddButton = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idItems::action::");
			oAddButton.attachPress(this.onShowSelectDialog, this);
			
			var oTableCand = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idItems::Table");
			oTableCand.setRequestAtLeastFields(["DealRequestRecordItemUUID", "DealItemInternalSequenceNumber", "DealItemUUID"]);
			oTableCand.setUseExportToExcel(true);
			
			var oTableHistory = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idStatusFacet::Table");
			oTableHistory.setUseExportToExcel(true);

			var oModel = this.getOwnerComponent().getModel();
			oModel.attachBatchRequestCompleted(this._batchRequestCompletedController, this);
			
		
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
			return Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idItems::responsiveTable");
		},
		
		/**
		 * Call need functions based on batch requests.
		 * @private
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		_batchRequestCompletedController: function (oEvent) {
			var aRequest = oEvent.getParameter("requests");
			if (aRequest && aRequest[0] && aRequest[0].url) {
				var sUrl = aRequest[0].url;
				var sMethod = aRequest[0].method;
				if (sUrl.includes("SetDdsgntnReqStatusToCancel") || 
					sUrl.includes("SetDdsgntnReqStatusToCreate") || 
					sUrl.includes("SetDdsgntnReqStatusToRelease") || 
					sUrl.includes("SetDdsgntnReqStatusToReject") || 
					sUrl.includes("SetDdsgntnReqStatusToApprove")) {
						this._refreshStatusesFacet();
				}
				if (sUrl.includes("/to_DealItem")) {
					this._checkLength();
				}
			if (sMethod === "MERGE" || sUrl.includes("DetmReclassificationHandling") || sUrl.includes("ResetDefaultProposedCandidates")) {
					this._refreshTransactionsFacet();
				}
			}
		},
		
		/**
		 * Compare initial table length and current table length.
		 * @private
		 */
		_checkLength: function () {
			var nCurrentTableLength = this._getTransactionsTable().getItems().length;
			if (nCurrentTableLength < this.nInitialItemsLength) {
				this._updateDdsgntnItemIntSequenceNumber();
			}
			this.nInitialItemsLength = nCurrentTableLength;
		},

		
	

		/**
		 * Put new value for property - DdsgntnItemIntSequenceNumber into all table items.
		 * @private
		 */
		_updateDdsgntnItemIntSequenceNumber: function () {
			var oTable = this._getTransactionsTable();
			var aContexts = oTable.getItems();
			var aObj = aContexts.map(function(item){
				 	return item.getBindingContext().getObject();
			});
			var sUrl = "/DealRequesttem(DealItemUUID=guid'{DealItemUUID}',IsActiveEntity={IsActive})";
			
			for (var i = 0; i < aObj.length; i++) {
				if (aObj[i]) {
					var sDealItemUUID = aObj[i].DealItemUUID;
					var bIsActive =  aObj[i].IsActiveEntity;
					oTable.getModel().update(sUrl.replace("{DealItemUUID}", sDealItemUUID).replace("{IsActive}", bIsActive), 
					{DealItemInternalSequenceNumber: i + 1 + ""});
				}
			}
		},
	
		
		/**
		 * Update info in transactions facet.
		 * @private
		 */
		_refreshTransactionsFacet: function () {
			this.extensionAPI.refresh(
				"deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idItems::responsiveTable"
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
					name: "deal.ext.Fragments.TableSelect",
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					var oTableSelectTable = this.oTableSelectTable = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idTableSelectDialog-table");
					var sNewBindingPath = "/DealCandidates(P_DealRequestUUID=guid'" + oView.getBindingContext().getObject("DealRequestUUID") + "')/Set";
					oTableSelectTable.bindAggregation("items", sNewBindingPath, new sap.m.ColumnListItem({
						cells: [
							new sap.m.Text({
								text:"{DealItemSequenceNumber}"
							}),
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
					var oTableSelect = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idTableSelectDialog-dialog");
					this.oTableSelectHeaderContent = Fragment.load({
						id: oView.getId(),
						name: "deal.ext.Fragments.SubHeader",
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
					var oDdCand = aContexts[i].getObject();
					var sUrl = "/DealnRequest(DealRequestUUID=guid'{UUIDNumber}',IsActiveEntity={bIsActive})/to_DealItem";
					var sUUIDNumber = oCtx.getObject("DealRequestUUID");
					var bIsActive = oCtx.getObject("IsActiveEntity");
					var sDdsgntnItemIntSequenceNumber = this._getTransactionsTable().getItems().length + 1 + i + "";
					
					oODataModel.create(sUrl.replace("{UUIDNumber}", sUUIDNumber).replace("{bIsActive}", bIsActive), {
							CandidateContractStartDate: oDdCand.CandidateContractStartDate,
							CandidateDcsDeal: oDdCand.CandidateDcsDeal,
							CandidateQuantity: oDdCand.CandidateQuantity,
							CandidateQuantityUnit: oDdCand.CandidateQuantityUnit,
							CandidateCounterparty: oDdCand.CandidateCounterparty,
							DealRequestRecordItemUUID: oDdCand.CandidateUUID,
							DealItemSequenceNumber: oDdCand.DealItemSequenceNumber,
							DealItemInternalSequenceNumber: DealItemSequenceNumber
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
		
		
		/**
		 * Update info in status history facet.
		 * @private
		 */
		_refreshStatusesFacet: function () {
			this.extensionAPI.refresh(
				"deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DealRequest--idStatusFacet::responsiveTable"
			);
		}
		
	});
});