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
            // This function is kept for backward compatibility but mainly
            // relies on the _updateKPIs function through dataReceived event
            // Just trigger a refresh to ensure dataReceived fires
            var oTable = this.byId("salesOrderTable");
            if (!oTable) return;

            var oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            // The dataReceived event will handle the KPI update
        },

        _updateKPIs: function (oEvent) {
            var oData = oEvent.getParameter("data");
            var aData = oData ? oData.results : [];

            // Get the total count from __count if available (for filtered results)
            var iTotalOrders = oData && oData.__count ? parseInt(oData.__count) : aData.length;

            var oViewModel = this.getView().getModel("viewModel");

            // If no data, reset all KPIs to 0
            if (!aData || aData.length === 0) {
                oViewModel.setData({
                    totalOrders: 0,
                    totalRevenue: 0,
                    avgOrderValue: 0,
                    totalCustomers: 0
                });
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

            oViewModel.setData({
                totalOrders: iTotalOrders,
                totalRevenue: Math.round(fTotalRevenue),
                avgOrderValue: Math.round(fAvgOrderValue),
                totalCustomers: aCustomers.length
            });

            // Load customer names for visible items
            this._loadCustomerNames();
        },

        _loadCustomerNames: function() {
            var oTable = this.byId("salesOrderTable");
            if (!oTable) return;

            var aItems = oTable.getItems();
            var oBPModel = this.getOwnerComponent().getModel("bpModel");
            if (!oBPModel) return;

            var oCustomerCache = this._oCustomerCache || {};
            this._oCustomerCache = oCustomerCache;

            aItems.forEach(function(oItem) {
                var oContext = oItem.getBindingContext();
                if (!oContext) return;

                var sCustomerId = oContext.getProperty("SoldToParty");
                if (!sCustomerId) return;

                // Skip if already loaded
                if (oCustomerCache[sCustomerId]) {
                    this._updateCustomerCell(oItem, sCustomerId, oCustomerCache[sCustomerId]);
                    return;
                }

                // Load customer name
                oBPModel.read("/A_Customer('" + sCustomerId + "')", {
                    success: function(oData) {
                        var sCustomerName = oData.CustomerName || oData.BPCustomerName || sCustomerId;
                        oCustomerCache[sCustomerId] = sCustomerName;
                        this._updateCustomerCell(oItem, sCustomerId, sCustomerName);
                    }.bind(this),
                    error: function() {
                        // Keep customer ID if name lookup fails
                        oCustomerCache[sCustomerId] = sCustomerId;
                    }
                });
            }.bind(this));
        },

        _updateCustomerCell: function(oItem, sCustomerId, sCustomerName) {
            var aCells = oItem.getCells();
            if (aCells && aCells.length > 1) {
                var oCustomerCell = aCells[1]; // Customer is second cell
                if (oCustomerCell && oCustomerCell.getItems) {
                    var aItems = oCustomerCell.getItems();
                    if (aItems && aItems.length > 1) {
                        var oText = aItems[1]; // Text is second item in HBox
                        if (oText && oText.setText) {
                            oText.setText(sCustomerId + " - " + sCustomerName);
                        }
                    }
                }
            }
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
                // Set time to start of day (00:00:00)
                var oFromDate = new Date(oCreatedOnFrom);
                oFromDate.setHours(0, 0, 0, 0);
                aFilters.push(new Filter("SalesOrderDate", FilterOperator.GE, oFromDate));
            }
            if (oCreatedOnTo) {
                // Set time to end of day (23:59:59)
                var oToDate = new Date(oCreatedOnTo);
                oToDate.setHours(23, 59, 59, 999);
                aFilters.push(new Filter("SalesOrderDate", FilterOperator.LE, oToDate));
            }
            if (sOrderType) {
                aFilters.push(new Filter("SalesOrderType", FilterOperator.EQ, sOrderType));
            }

            // Apply filters
            var oTable = this.byId("salesOrderTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);

            // KPIs will be updated automatically by the dataReceived event
            MessageToast.show("Filters applied");
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

            // KPIs will be updated automatically by the dataReceived event
            MessageToast.show("Filters cleared");
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

            // KPIs will be updated automatically by the dataReceived event
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
        },

        // Formatter for document category types
        formatDocumentCategory: function(sCategory) {
            if (!sCategory) {
                return "N/A";
            }

            var oDocumentTypes = {
                "A": "Inquiry",
                "B": "Quotation",
                "C": "Sales Order",
                "D": "Item Proposal",
                "E": "Scheduling Agreement",
                "F": "Scheduling Agreement with Release Documentation",
                "G": "Contract",
                "H": "Return",
                "I": "Order",
                "J": "Delivery",
                "K": "Returns Delivery for Order",
                "L": "Delivery for Project",
                "M": "Invoice",
                "N": "Invoice Cancellation",
                "O": "Credit Memo",
                "P": "Debit Memo",
                "Q": "Pro Forma Invoice",
                "R": "WMS Transfer Order",
                "S": "Transfer Requirement",
                "T": "Delivery for Purchasing",
                "U": "Returns Delivery for Purchasing",
                "V": "Purchase Order",
                "W": "Independent Requirements",
                "X": "Handling Unit",
                "Y": "Goods Receipt",
                "Z": "Billing Document Request",
                "0": "Master Contract",
                "1": "Scheduling Agreement Release",
                "2": "External Requirement",
                "3": "Storage Location Rule",
                "4": "Batch Derivation",
                "5": "Display Picking",
                "6": "Delivery",
                "7": "Shipment",
                "8": "Sales Order Item",
                "9": "Project",
                "!": "Material Determination",
                "\"": "Sales Deal",
                "#": "Promotion",
                "$": "Listing",
                "%": "Listing Exclusion",
                "&": "Shipment Costs",
                "'": "Shipping Unit",
                "(": "Packing Instruction",
                ")": "Warehouse Request",
                "*": "Shipment Request",
                "+": "Outbound Delivery for Returns",
                ",": "Returns Material Authorization",
                "-": "Returns Delivery",
                ".": "Credit Memo Request",
                "/": "Debit Memo Request",
                ":": "Subsequent Outbound Delivery",
                ";": "Subsequent Billing Document",
                "<": "Stock Transfer Order",
                "=": "Stock Transport Order",
                ">": "Replenishment Delivery",
                "?": "Cross-Company Stock Transfer",
                "@": "Service Order",
                "[": "Service Confirmation",
                "\\": "Service Entry Sheet",
                "]": "Quality Notification",
                "^": "Maintenance Order",
                "_": "Equipment",
                "`": "Functional Location",
                "{": "Production Order",
                "|": "Process Order",
                "}": "Planned Order",
                "~": "Purchase Requisition",
                "f001": "Standard Order",
                "f002": "Rush Order",
                "f003": "Consignment Fill-up",
                "f004": "Consignment Pick-up",
                "CEM": "Customer Equipment Material",
                "BOS": "Bill of Services",
                "TA": "Standard Sales Order",
                "OR": "Standard Order",
                "RE": "Returns",
                "CR": "Credit Memo Request",
                "DR": "Debit Memo Request",
                "KB": "Consignment Fill-Up",
                "KE": "Consignment Issue",
                "KA": "Consignment Pick-Up"
            };

            return oDocumentTypes[sCategory] || sCategory;
        },

        // Get first preceding document
        getFirstPrecedingDoc: function(aPrecedingDocs) {
            if (aPrecedingDocs && aPrecedingDocs.length > 0) {
                var oDoc = aPrecedingDocs[0];
                return {
                    number: oDoc.PrecedingDocument || "N/A",
                    category: this.formatDocumentCategory(oDoc.PrecedingDocumentCategory)
                };
            }
            return { number: "None", category: "" };
        },

        // Get first subsequent document
        getFirstSubsequentDoc: function(aSubsequentDocs) {
            if (aSubsequentDocs && aSubsequentDocs.length > 0) {
                var oDoc = aSubsequentDocs[0];
                return {
                    number: oDoc.SubsequentDocument || "N/A",
                    category: this.formatDocumentCategory(oDoc.SubsequentDocumentCategory)
                };
            }
            return { number: "None", category: "" };
        }
    });
});
