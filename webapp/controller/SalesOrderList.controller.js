sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, MessageToast, JSONModel, Fragment) {
    "use strict";

    return Controller.extend("salesorder.ui5.app.controller.SalesOrderList", {

        onInit: function () {
            // Create view model for KPIs
            var oViewModel = new JSONModel({
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                totalCustomers: 0
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Wait for the view to be rendered before attaching to binding
            this.getView().attachAfterRendering(function() {
                var oTable = this.byId("salesOrderTable");
                if (oTable) {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.attachDataReceived(this._updateKPIs.bind(this));
                    } else {
                        // If binding is not ready, attach event when it's created
                        oTable.attachUpdateFinished(this._onTableUpdateFinished.bind(this));
                    }
                }
            }.bind(this));
        },

        _onTableUpdateFinished: function(oEvent) {
            var oTable = oEvent.getSource();
            var oBinding = oTable.getBinding("items");
            if (oBinding && !oBinding.hasListeners("dataReceived")) {
                oBinding.attachDataReceived(this._updateKPIs.bind(this));
            }
            // Calculate KPIs immediately from current data
            this._calculateKPIsFromTable();
        },

        _calculateKPIsFromTable: function() {
            var oTable = this.byId("salesOrderTable");
            if (!oTable) return;

            var aItems = oTable.getItems();
            if (!aItems || aItems.length === 0) return;

            var iTotalOrders = aItems.length;
            var fTotalRevenue = 0;
            var aCustomers = [];

            aItems.forEach(function(oItem) {
                var oContext = oItem.getBindingContext();
                if (oContext) {
                    var oData = oContext.getObject();
                    if (oData.TotalNetAmount) {
                        fTotalRevenue += parseFloat(oData.TotalNetAmount);
                    }
                    if (oData.SoldToParty && aCustomers.indexOf(oData.SoldToParty) === -1) {
                        aCustomers.push(oData.SoldToParty);
                    }
                }
            });

            var fAvgOrderValue = iTotalOrders > 0 ? fTotalRevenue / iTotalOrders : 0;

            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setData({
                totalOrders: iTotalOrders,
                totalRevenue: Math.round(fTotalRevenue),
                avgOrderValue: Math.round(fAvgOrderValue),
                totalCustomers: aCustomers.length
            });
        },

        _updateKPIs: function (oEvent) {
            var oData = oEvent.getParameter("data");
            var aData = oData ? oData.results : [];

            // Get the total count from __count if available (for filtered results)
            var iTotalOrders = oData && oData.__count ? parseInt(oData.__count) : aData.length;

            if (!aData || aData.length === 0) {
                // If no data, still update with count if available
                if (iTotalOrders > 0) {
                    var oViewModel = this.getView().getModel("viewModel");
                    var currentData = oViewModel.getData();
                    currentData.totalOrders = iTotalOrders;
                    oViewModel.setData(currentData);
                }
                return;
            }

            var fTotalRevenue = 0;
            var aCustomers = [];

            aData.forEach(function (oOrder) {
                if (oOrder.TotalNetAmount) {
                    fTotalRevenue += parseFloat(oOrder.TotalNetAmount);
                }
                if (oOrder.SoldToParty && aCustomers.indexOf(oOrder.SoldToParty) === -1) {
                    aCustomers.push(oOrder.SoldToParty);
                }
            });

            var fAvgOrderValue = aData.length > 0 ? fTotalRevenue / aData.length : 0;

            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setData({
                totalOrders: iTotalOrders,
                totalRevenue: Math.round(fTotalRevenue),
                avgOrderValue: Math.round(fAvgOrderValue),
                totalCustomers: aCustomers.length
            });
        },

        onKPIPress: function (oEvent) {
            MessageToast.show("KPI Tile Pressed");
        },

        onRefresh: function () {
            var oTable = this.byId("salesOrderTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
                MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("refreshSuccess"));
                // Recalculate KPIs after refresh
                setTimeout(function() {
                    this._calculateKPIsFromTable();
                }.bind(this), 500);
            }
        },

        onFilterApply: function() {
            var aFilters = [];

            // Get filter values
            var sSalesOrder = this.byId("filterSalesOrder").getValue();
            var sCustomer = this.byId("filterCustomer").getValue();
            var sCreatedBy = this.byId("filterCreatedBy").getValue();
            var sSalesOrg = this.byId("filterSalesOrg").getValue();
            var oCreatedOnFrom = this.byId("filterCreatedOnFrom").getDateValue();
            var oCreatedOnTo = this.byId("filterCreatedOnTo").getDateValue();
            var sOrderType = this.byId("filterOrderType").getSelectedKey();

            // Build filters
            if (sSalesOrder) {
                aFilters.push(new Filter("SalesOrder", FilterOperator.Contains, sSalesOrder));
            }
            if (sCustomer) {
                aFilters.push(new Filter("SoldToParty", FilterOperator.Contains, sCustomer));
            }
            if (sCreatedBy) {
                aFilters.push(new Filter("CreatedByUser", FilterOperator.Contains, sCreatedBy));
            }
            if (sSalesOrg) {
                aFilters.push(new Filter("SalesOrganization", FilterOperator.Contains, sSalesOrg));
            }
            if (oCreatedOnFrom) {
                aFilters.push(new Filter("CreationDate", FilterOperator.GE, oCreatedOnFrom));
            }
            if (oCreatedOnTo) {
                aFilters.push(new Filter("CreationDate", FilterOperator.LE, oCreatedOnTo));
            }
            if (sOrderType) {
                aFilters.push(new Filter("SalesOrderType", FilterOperator.EQ, sOrderType));
            }

            // Apply filters
            var oTable = this.byId("salesOrderTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);

            // Recalculate KPIs after filtering
            setTimeout(function() {
                this._calculateKPIsFromTable();
            }.bind(this), 300);
        },

        onFilterClear: function() {
            // Clear all filter fields
            this.byId("filterSalesOrder").setValue("");
            this.byId("filterCustomer").setValue("");
            this.byId("filterCreatedBy").setValue("");
            this.byId("filterSalesOrg").setValue("");
            this.byId("filterCreatedOnFrom").setValue("");
            this.byId("filterCreatedOnTo").setValue("");
            this.byId("filterOrderType").setSelectedKey("");

            // Clear table filters
            var oTable = this.byId("salesOrderTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter([]);

            // Recalculate KPIs
            setTimeout(function() {
                this._calculateKPIsFromTable();
            }.bind(this), 300);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var aFilters = [];

            if (sQuery && sQuery.length > 0) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("SalesOrder", FilterOperator.Contains, sQuery),
                        new Filter("SoldToParty", FilterOperator.Contains, sQuery),
                        new Filter("CreatedByUser", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            var oTable = this.byId("salesOrderTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);

            // Recalculate KPIs after search
            setTimeout(function() {
                this._calculateKPIsFromTable();
            }.bind(this), 300);
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sSalesOrder = oContext.getProperty("SalesOrder");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("salesOrderDetail", {
                orderId: sSalesOrder
            });
        },

        // Value Help Functions
        _createValueHelpDialog: function(sTitle, sBindingPath, sFieldName, sInputId) {
            var that = this;

            if (!this._oValueHelpDialog) {
                Fragment.load({
                    name: "salesorder.ui5.app.view.ValueHelpDialog",
                    controller: this
                }).then(function(oDialog) {
                    that._oValueHelpDialog = oDialog;
                    that.getView().addDependent(that._oValueHelpDialog);
                    that._showValueHelpDialog(sTitle, sBindingPath, sFieldName, sInputId);
                });
            } else {
                this._showValueHelpDialog(sTitle, sBindingPath, sFieldName, sInputId);
            }
        },

        _showValueHelpDialog: function(sTitle, sBindingPath, sFieldName, sInputId) {
            var that = this;
            this._oValueHelpDialog.setTitle(sTitle);
            this._sCurrentInputId = sInputId;
            this._sCurrentFieldName = sFieldName;

            // Fetch data and get unique values
            var oModel = this.getView().getModel();
            var sPath = sBindingPath + "?$select=" + sFieldName;

            oModel.read(sBindingPath, {
                urlParameters: {
                    "$select": sFieldName,
                    "$top": "1000"
                },
                success: function(oData) {
                    // Extract unique values
                    var aUniqueValues = [];
                    var oSeen = {};

                    if (oData && oData.results) {
                        oData.results.forEach(function(oItem) {
                            var sValue = oItem[sFieldName];
                            if (sValue && !oSeen[sValue]) {
                                oSeen[sValue] = true;
                                aUniqueValues.push({ value: sValue });
                            }
                        });
                    }

                    // Sort unique values
                    aUniqueValues.sort(function(a, b) {
                        return a.value.localeCompare(b.value);
                    });

                    // Create a local JSON model with unique values
                    var oLocalModel = new sap.ui.model.json.JSONModel({
                        items: aUniqueValues
                    });

                    // Bind to the dialog
                    that._oValueHelpDialog.setModel(oLocalModel, "valueHelp");
                    that._oValueHelpDialog.bindAggregation("items", {
                        path: "valueHelp>/items",
                        template: new sap.m.StandardListItem({
                            title: "{valueHelp>value}",
                            type: "Active"
                        })
                    });

                    that._oValueHelpDialog.open();
                },
                error: function(oError) {
                    sap.m.MessageToast.show("Error loading value help data");
                }
            });
        },

        onValueHelpSalesOrder: function() {
            this._createValueHelpDialog("Select Sales Order", "/A_SalesOrder", "SalesOrder", "filterSalesOrder");
        },

        onValueHelpCustomer: function() {
            this._createValueHelpDialog("Select Customer", "/A_SalesOrder", "SoldToParty", "filterCustomer");
        },

        onValueHelpCreatedBy: function() {
            this._createValueHelpDialog("Select User", "/A_SalesOrder", "CreatedByUser", "filterCreatedBy");
        },

        onValueHelpSalesOrg: function() {
            this._createValueHelpDialog("Select Sales Organization", "/A_SalesOrder", "SalesOrganization", "filterSalesOrg");
        },

        onValueHelpConfirm: function(oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sValue = oSelectedItem.getTitle();
                this.byId(this._sCurrentInputId).setValue(sValue);
            }
        },

        onValueHelpSearch: function(oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("SalesOrder", FilterOperator.Contains, sValue),
                    new Filter("SoldToParty", FilterOperator.Contains, sValue),
                    new Filter("CreatedByUser", FilterOperator.Contains, sValue)
                ],
                and: false
            });

            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        }
    });
});
