sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function (Controller, History) {
    "use strict";

    return Controller.extend("salesorder.ui5.app.controller.SalesOrderDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("salesOrderDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            var that = this;

            // Bind header to default model (API_SALES_ORDER_SRV)
            this.getView().bindElement({
                path: "/A_SalesOrder('" + sOrderId + "')",
                parameters: {
                    $expand: 'to_Item/to_ScheduleLine'
                },
                events: {
                    dataReceived: function() {
                        // Load customer name from Business Partner service
                        var oContext = that.getView().getBindingContext();
                        if (oContext) {
                            var sCustomerId = oContext.getProperty("SoldToParty");
                            if (sCustomerId) {
                                that._loadCustomerName(sCustomerId);
                            }
                        }
                    }
                }
            });

            // Bind items table to itemModel (ZC_P2P_SALES_ORDER_INFO)
            var oItemsTable = this.byId("itemsTable");
            if (oItemsTable) {
                oItemsTable.bindItems({
                    path: "itemModel>/SalesOrderItems",
                    filters: [
                        new sap.ui.model.Filter("SalesOrder", sap.ui.model.FilterOperator.EQ, sOrderId)
                    ],
                    template: oItemsTable.getBindingInfo("items") ?
                        oItemsTable.getBindingInfo("items").template :
                        oItemsTable.getItems()[0].clone()
                });
            }
        },

        _loadCustomerName: function(sCustomerId) {
            var oBPModel = this.getOwnerComponent().getModel("bpModel");
            var that = this;

            oBPModel.read("/A_Customer('" + sCustomerId + "')", {
                success: function(oData) {
                    var sCustomerName = oData.CustomerName || oData.BPCustomerName || sCustomerId;
                    var oCustomerText = that.byId("customerText");
                    if (oCustomerText) {
                        oCustomerText.setText(sCustomerName);
                    }
                },
                error: function() {
                    // Keep the customer ID if name lookup fails
                }
            });
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("salesOrderList", {}, true);
            }
        },

        onItemSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oScheduleLineTable = this.byId("scheduleLineTable");
            var oScheduleLineSection = this.byId("scheduleLineSection");
            var oScheduleLineTitle = this.byId("scheduleLineTitle");

            if (oSelectedItem) {
                // Get context from itemModel
                var oContext = oSelectedItem.getBindingContext("itemModel");
                var sOrderId = oContext.getProperty("SalesOrder");
                var sItemNumber = oContext.getProperty("SalesOrderItem");

                // Bind schedule line table to default model's schedule lines
                // We need to use the API_SALES_ORDER_SRV path since schedule lines come from there
                var sPath = "/A_SalesOrderItem(SalesOrder='" + sOrderId + "',SalesOrderItem='" + sItemNumber + "')/to_ScheduleLine";

                oScheduleLineTable.bindItems({
                    path: sPath,
                    template: oScheduleLineTable.getBindingInfo("items") ?
                        oScheduleLineTable.getBindingInfo("items").template :
                        this._createScheduleLineTemplate()
                });

                // Update title and show section
                oScheduleLineTitle.setText("Schedule Line Items for Item " + sItemNumber);
                oScheduleLineSection.setVisible(true);
            }
        },

        _createScheduleLineTemplate: function () {
            return new sap.m.ColumnListItem({
                cells: [
                    new sap.m.VBox({
                        alignItems: "Center",
                        class: "sapUiTinyMarginTop",
                        items: [
                            new sap.m.HBox({
                                alignItems: "Center",
                                items: [
                                    new sap.ui.core.Icon({
                                        src: "sap-icon://numbered-text",
                                        color: "#667eea",
                                        size: "1rem",
                                        class: "sapUiTinyMarginEnd"
                                    }),
                                    new sap.m.Text({
                                        text: "{ScheduleLine}",
                                        class: "itemNumber"
                                    })
                                ]
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({
                                src: "sap-icon://date-time",
                                color: "#667eea",
                                class: "sapUiTinyMarginBottom"
                            }),
                            new sap.m.Text({
                                text: {
                                    path: 'ConfirmedDeliveryDate',
                                    type: 'sap.ui.model.type.Date',
                                    formatOptions: {
                                        style: 'medium'
                                    }
                                },
                                class: "deliveryDate"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "End",
                        items: [
                            new sap.m.ObjectNumber({
                                number: {
                                    path: 'ScheduleLineOrderQuantity',
                                    type: 'sap.ui.model.type.Float',
                                    formatOptions: {
                                        maxFractionDigits: 3,
                                        minFractionDigits: 0
                                    }
                                },
                                class: "quantityNumber"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "End",
                        items: [
                            new sap.m.ObjectNumber({
                                number: {
                                    path: 'ConfdOrderQtyByMatlAvailCheck',
                                    type: 'sap.ui.model.type.Float',
                                    formatOptions: {
                                        maxFractionDigits: 3,
                                        minFractionDigits: 0
                                    }
                                },
                                state: "{= ${ConfdOrderQtyByMatlAvailCheck} >= ${ScheduleLineOrderQuantity} ? 'Success' : 'Warning' }",
                                class: "quantityNumber"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "End",
                        items: [
                            new sap.m.ObjectNumber({
                                number: {
                                    path: 'CorrectedQtyInOrderQtyUnit',
                                    type: 'sap.ui.model.type.Float',
                                    formatOptions: {
                                        maxFractionDigits: 3,
                                        minFractionDigits: 0
                                    }
                                },
                                class: "quantityNumber"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "End",
                        items: [
                            new sap.m.ObjectNumber({
                                number: {
                                    path: 'DeliveredQtyInOrderQtyUnit',
                                    type: 'sap.ui.model.type.Float',
                                    formatOptions: {
                                        maxFractionDigits: 3,
                                        minFractionDigits: 0
                                    }
                                },
                                state: "{= ${DeliveredQtyInOrderQtyUnit} >= ${ScheduleLineOrderQuantity} ? 'Success' : 'None' }",
                                class: "quantityNumber"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.Text({
                                text: "{OrderQuantityUnit}",
                                class: "unitText"
                            })
                        ]
                    }),
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.ObjectStatus({
                                text: "{= ${DeliveredQtyInOrderQtyUnit} >= ${ScheduleLineOrderQuantity} ? 'Delivered' : ${ConfdOrderQtyByMatlAvailCheck} > 0 ? 'Confirmed' : 'Planned' }",
                                state: "{= ${DeliveredQtyInOrderQtyUnit} >= ${ScheduleLineOrderQuantity} ? 'Success' : ${ConfdOrderQtyByMatlAvailCheck} > 0 ? 'Warning' : 'None' }",
                                icon: "{= ${DeliveredQtyInOrderQtyUnit} >= ${ScheduleLineOrderQuantity} ? 'sap-icon://status-positive' : ${ConfdOrderQtyByMatlAvailCheck} > 0 ? 'sap-icon://pending' : 'sap-icon://calendar' }"
                            })
                        ]
                    })
                ]
            });
        }
    });
});
