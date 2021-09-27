sap.ui.define("project1.ext.controller.ListReportExt", [
    "jquery.sap.global",
	"sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/unified/FileUploaderParameter",
	"sap/m/Toolbar",
	"sap/m/Label"
],
function (jQuery, BusyIndicator, JSONModel, FilterOperator, MessageToast, MessageBox, FileUploaderParameter, Toolbar, Label){
    "use strict";
    return {

		onClickUploadData: function (oEvent) {
            //alert('onClickUploadData');
			this._importCollection = "/StreamCollection";
			this._oDialog = sap.ui.xmlfragment("project1.ext.fragment.UploadData", this);
			this.getView().addDependent(this._oDialog);
			this._oDialog.open();
		},

        onUploadPress: function(oEvent) {
            //alert('onUploadPress');
             var oFileUploader = oEvent.getSource().getParent().getContent()[0],
			sToken = this.getView().getModel().getSecurityToken();
			if (!this._fillFileUploader(oFileUploader, sToken)) {
				this._oDialog.close();
				this._oDialog.destroy();
				return;
			}
			this._oDialog.close();
          
        },

		_fillFileUploader: function (oFileUploader, sToken) {
			if (!oFileUploader.getValue()) {
				return false;
			}
			oFileUploader.removeAllHeaderParameters();
			oFileUploader.addHeaderParameter(new FileUploaderParameter({
				name: "x-csrf-token",
				value: sToken
			}));
			oFileUploader.addHeaderParameter(new FileUploaderParameter({
				name: "Content-Type",
				value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			}));
			oFileUploader.addHeaderParameter(new FileUploaderParameter({
				name: "Accept",
				value: "application/json"
			}));
			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "slug",
				value: oFileUploader.getValue()
			}));

			oFileUploader.setMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
			oFileUploader.setUploadUrl("/sap/opu/odata/sap/ZAP_DATA_UPLOAD_SRV" + this._importCollection);

			oFileUploader.checkFileReadable().then(function () {
				oFileUploader.upload();
			}, function (error) {
				MessageToast.show(this._i18nBundle.getText("messageWarningReadWithError"));
				return false;
			});
			return true;
        },
        
    	onCloseImportDialog: function () {
			this._oDialog.close();
			this._oDialog.destroy();
		},

    };
});
