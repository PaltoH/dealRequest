sap.ui.define([
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/core/dnd/DragInfo",
	"sap/ui/core/dnd/DropInfo",
	"sap/ui/core/dnd/DropPosition",
	"sap/ui/core/dnd/DropLayout",
	"sap/ui/core/Core",
	"sap/m/MessageBox"

], function (Fragment, Filter, DragInfo, DropInfo, DropPosition, DropLayout, Core, MessageBox) {
	"use strict";

	return sap.ui.controller("deal.ext.controller.ObjectPageExt", {

		/**
		 * Controller's "init" lifecycle method.
		 * @public
		 */
		onInit: function () {
			var oAddButton = Core.byId("deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idItems::action::");
			oAddButton.attachPress(this.onShowSelectDialog, this);
			
			var oTableCand = Core.byId("ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idItems::Table");
			oTableCand.setRequestAtLeastFields(["DdsgntnRequestRecordItemUUID", "DdsgntnItemIntSequenceNumber", "DedesignationItemUUID"]);
			oTableCand.setUseExportToExcel(true);
			
			var oTableHistory = Core.byId("ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idStatusFacet::Table");
			oTableHistory.setUseExportToExcel(true);

			var oModel = this.getOwnerComponent().getModel();
			oModel.attachBatchRequestCompleted(this._batchRequestCompletedController, this);
			
			this._createAppComponent();
		
		},
		
		/**
		 * Create aap component for application log functionality.
		 * @private
		 */
		_createAppComponent: function () {
			this._oAppComponent = this.getOwnerComponent().getAppComponent();
			var sCompId = Fragment.createId("appLogFragment", "LogMessagesControlComponent");
			this._oComp = this._oAppComponent._oComp;
			if (!this._oComp) {
				this._oAppComponent._oComp = Core.getComponent(sCompId) ?
					Core.getComponent(sCompId) :
					this.getOwnerComponent().runAsOwner(function () {
						return Core.createComponent({
							name: "sap.nw.core.applogs.lib.reuse.applogs",
							id: sCompId,
							settings: {
								"persistencyKey": "ApplicationLog",
								"showHeader": false,
								"showFilterBar": true,
								"logDataServiceUrl": "/sap/opu/odata/sap/APL_LOG_MANAGEMENT_SRV/"
							}
						});
					});
				this._oComp = this._oAppComponent._oComp;
			}
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
			return Core.byId("ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idItems::responsiveTable");
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
				if (sUrl.includes("/to_DdsgntnItem")) {
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
		 * Event handler for Reset button.
		 * @public
		 */
		onResetButtonPress: function () {
			this._i18nBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			
			MessageBox.warning(this._i18nBundle.getText("resetAllItems"), {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sButton) {
					if (sButton === MessageBox.Action.OK) {
						this.onResetButtonPressReset();
					}
				}.bind(this)
			});
		},
		
		/**
		 * Event handler for OK button in warning window.
		 * @public
		 */
		onResetButtonPressReset: function () {
			var oCtx = this._getViewContext();
			var oTable = this._getTransactionsTable();
			oTable.getModel().callFunction("/ResetDefaultProposedCandidates", {
				method: "POST",
				urlParameters: {
					"DedesignationRequestUUID": oCtx.getObject("DedesignationRequestUUID"),
					"IsActiveEntity": oCtx.getObject("IsActiveEntity")
				}
			});
			this.nInitialItemsLength = this._getTransactionsTable().getItems().length;
		},
		
		
		onRecalculateOCIHandlingPress: function () {
			this._i18nBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			
			MessageBox.warning(this._i18nBundle.getText("recalculateOCIHandling"), {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sButton) {
					if (sButton === MessageBox.Action.OK) {
						this.onRecalculateOCIHandlingPressRecalculate();
					}
				}.bind(this)
			});
		},
		
		/**
		 * Event handler for Recalculate OCI Handling button.
		 * @public
		 */
		onRecalculateOCIHandlingPressRecalculate: function () {
			var oCtx = this._getViewContext();
			var oTable = this._getTransactionsTable();
			oTable.getModel().callFunction("/DetmReclassificationHandling", {
				method: "POST",
				urlParameters: {
					"DedesignationRequestUUID": oCtx.getObject("DedesignationRequestUUID"),
					"IsActiveEntity": oCtx.getObject("IsActiveEntity")
				}
			});
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
			var sUrl = "/DedesignationItem(DedesignationItemUUID=guid'{DedesignationItemUUID}',IsActiveEntity={IsActive})";
			
			for (var i = 0; i < aObj.length; i++) {
				if (aObj[i]) {
					var sDedesignationItemUUID = aObj[i].DedesignationItemUUID;
					var bIsActive =  aObj[i].IsActiveEntity;
					oTable.getModel().update(sUrl.replace("{DedesignationItemUUID}", sDedesignationItemUUID).replace("{IsActive}", bIsActive), 
					{DdsgntnItemIntSequenceNumber: i + 1 + ""});
				}
			}
		},
	
		
		/**
		 * Update info in transactions facet.
		 * @private
		 */
		_refreshTransactionsFacet: function () {
			this.extensionAPI.refresh(
				"deal::sap.suite.ui.generic.template.ObjectPage.view.Details::DeaDedesignationRequestDedesignationRequest--idItems::responsiveTable"
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
					name: "ibso.commodity.dedesignation.manage.ext.Fragments.TableSelect",
					controller: this
				}).then(function(oDialog){
					oView.addDependent(oDialog);
					var oTableSelectTable = this.oTableSelectTable = Core.byId("ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idTableSelectDialog-table");
					var sNewBindingPath = "/HedgeConstellationCandidates(P_DedesignationRequestUUID=guid'" + oView.getBindingContext().getObject("DedesignationRequestUUID") + "')/Set";
					oTableSelectTable.bindAggregation("items", sNewBindingPath, new sap.m.ColumnListItem({
						cells: [
							new sap.m.Text({
								text:"{DdsgntnItemIntSequenceNumber}"
							}),
							new sap.m.Text({
								text:"{DedesignationCandidateDCSDeal}"
							}),
							new sap.m.Text({
								text: {
									parts: [
										{path: 'DedesignationCandidateQuantity'},
										{path: 'DdsgntnCandidateQuantityUnit'}
									]
								}
							}),
							new sap.m.Text({
								text:"{DdsgntnCandidateCounterparty}"
							}),
							new sap.m.Text({
								text: {
									path: 'DdsgntnCandContractStartDate',
									type: 'sap.ui.model.type.Date',
									formatOptions: {
										pattern: 'dd.MM.yyyy'
									}
								}
							}),
							new sap.m.Text({
								text: {
									path: 'DdsgntnCandPricingStartDate',
									type: 'sap.ui.model.type.Date',
									formatOptions: {
										pattern: 'dd.MM.yyyy'
									}
								}
							}),
							new sap.m.Text({
								text: {
									path: 'DdsgntnCandidatePricingEndDate',
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
					var oTableSelect = Core.byId("ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idTableSelectDialog-dialog");
					this.oTableSelectHeaderContent = Fragment.load({
						id: oView.getId(),
						name: "ibso.commodity.dedesignation.manage.ext.Fragments.SubHeader",
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
					var sUrl = "/DedesignationRequest(DedesignationRequestUUID=guid'{UUIDNumber}',IsActiveEntity={bIsActive})/to_DdsgntnItem";
					var sUUIDNumber = oCtx.getObject("DedesignationRequestUUID");
					var bIsActive = oCtx.getObject("IsActiveEntity");
					var sDdsgntnItemIntSequenceNumber = this._getTransactionsTable().getItems().length + 1 + i + "";
					
					oODataModel.create(sUrl.replace("{UUIDNumber}", sUUIDNumber).replace("{bIsActive}", bIsActive), {
							DdsgntnCandContractStartDate: oDdCand.DdsgntnCandContractStartDate,
							DedesignationCandidateDCSDeal: oDdCand.DedesignationCandidateDCSDeal,
							DedesignationCandidateQuantity: oDdCand.DedesignationCandidateQuantity,
							DdsgntnCandidateQuantityUnit: oDdCand.DdsgntnCandidateQuantityUnit,
							DdsgntnCandidateCounterparty: oDdCand.DdsgntnCandidateCounterparty,
							DdsgntnCandPricingStartDate: oDdCand.DdsgntnCandPricingStartDate,
							DdsgntnCandidatePricingEndDate: oDdCand.DdsgntnCandidatePricingEndDate,
							DdsgntnRequestRecordItemUUID: oDdCand.DdsgntnRequestRecordItemUUID,
							DdsgntnItemSequenceNumber: oDdCand.DdsgntnItemIntSequenceNumber,
							DdsgntnItemIntSequenceNumber: sDdsgntnItemIntSequenceNumber
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
					aSearchFilters.push(new Filter("DedesignationCandidateDCSDeal", "Contains", sValue));
					aSearchFilters.push(new Filter("DdsgntnCandidateCounterparty", "Contains", sValue));
				} else if (!isNaN(sValue) && sValue) {
					aSearchFilters.push(new Filter("DedesignationCandidateQuantity", "EQ", +sValue));
					aSearchFilters.push(new Filter("DedesignationCandidateDCSDeal", "Contains", sValue));
					aSearchFilters.push(new Filter("DdsgntnCandidateCounterparty", "Contains", sValue));
				}
			}
			oBinding.filter(new Filter(aSearchFilters, false));
		},
		
		/**
		 * Event handler for Show application log button in header.
		 * @public
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		onPressShowLog: function (oEvent) {
			this._oAppComponent._uploadAppLogPromise = this._oAppComponent._uploadAppLogPromise || Fragment.load({
				id: "idAppLogDialogDedesignation",
				name: "ibso.commodity.dedesignation.manage.ext.Fragments.ApplicationLog",
				controller: this
			});
			this._oAppComponent._uploadAppLogPromise.then(function (oDialog) {
				this.getView().addDependent(oDialog);
				this._oAppComponent._oLogContainter = this._oAppComponent._oLogContainter || Fragment.byId("idAppLogDialogDedesignation",
					"LogMessagesControlContainer");
				this._oAppComponent._oLogContainter.setComponent(this._oComp);
				this._oComp.setLogHandle(this.getView().getBindingContext().getObject().DedesignationRequestLogHandle);
				this._oComp.updateModel();
				this._oComp.refresh();
				oDialog.open();
			}.bind(this));
		},
		
		/**
		 * Event handler for Close button in showApplicationLog window.
		 * @public
		 * @param {sap.ui.base.Event} oEvent event object.
		 */
		onLogButtonClose: function (oEvent) {
			var oDialog = oEvent.getSource().getParent();
			oDialog.close();
		},
		
		/**
		 * Update info in status history facet.
		 * @private
		 */
		_refreshStatusesFacet: function () {
			this.extensionAPI.refresh(
				"ibso.commodity.dedesignation.manage::sap.suite.ui.generic.template.ObjectPage.view.Details::DedesignationRequest--idStatusFacet::responsiveTable"
			);
		}
		
	});
});