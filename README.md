# Sales Order UI5 Application

A simple SAPUI5 application for managing sales orders, deployed on SAP Business Technology Platform (BTP).

## Features

- Display list of sales orders
- Search and filter sales orders
- View detailed sales order information
- View sales order items
- Responsive design for desktop, tablet, and phone

## Project Structure

```
salesorder-ui5-app/
├── webapp/
│   ├── controller/
│   │   ├── SalesOrderList.controller.js
│   │   └── SalesOrderDetail.controller.js
│   ├── view/
│   │   ├── SalesOrderList.view.xml
│   │   └── SalesOrderDetail.view.xml
│   ├── model/
│   ├── css/
│   │   └── style.css
│   ├── i18n/
│   │   └── i18n.properties
│   ├── Component.js
│   ├── manifest.json
│   └── index.html
├── package.json
├── ui5.yaml
├── ui5-deploy.yaml
├── xs-app.json
├── xs-security.json
├── mta.yaml
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- SAP Business Application Studio (BAS) or local development environment
- Access to SAP BTP Cloud Foundry environment
- SAP Backend system with Sales Order OData service

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

1. Start the application locally:
```bash
npm start
```

2. The application will open in your default browser at `http://localhost:8080/index.html`

## Build

Build the application for deployment:
```bash
npm run build
```

## Deployment to SAP BTP

### Using Cloud Foundry CLI

1. Login to Cloud Foundry:
```bash
cf login
```

2. Build the MTA archive:
```bash
mbt build
```

3. Deploy to SAP BTP:
```bash
cf deploy mta_archives/salesorder-ui5-app_1.0.0.mtar
```

### Using SAP Business Application Studio

1. Right-click on the `mta.yaml` file
2. Select "Build MTA Project"
3. After build completes, right-click on the generated `.mtar` file in `mta_archives` folder
4. Select "Deploy MTA Archive"

## Configuration

### Backend Configuration

Update the OData service URL in [webapp/manifest.json](webapp/manifest.json):

```json
"dataSources": {
  "salesOrderService": {
    "uri": "/sap/opu/odata/sap/API_SALES_ORDER_SRV/",
    "type": "OData"
  }
}
```

### Destination Configuration

Configure the SAP Backend destination in BTP Cockpit:
- Name: `SAP_BACKEND`
- Type: HTTP
- URL: Your SAP backend URL
- Authentication: Choose appropriate method

## OData Service

The application uses the SAP Sales Order OData service:
- Service: `API_SALES_ORDER_SRV`
- Entity Sets:
  - `A_SalesOrder` - Sales Order Header
  - `A_SalesOrderItem` - Sales Order Items

## Security

The application uses XSUAA for authentication and authorization:
- Role: `SalesOrderViewer`
- Scope: `Display` sales orders

## Technologies Used

- SAPUI5 / OpenUI5
- OData V2
- SAP Fiori Design Guidelines
- SAP BTP Cloud Foundry
- XSUAA Authentication

## License

This project is licensed under the Apache 2.0 License.
