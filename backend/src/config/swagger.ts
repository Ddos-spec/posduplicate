import swaggerJsdoc = require('swagger-jsdoc');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyPOS API Documentation',
      version: '1.0.0',
      description: `
        MyPOS - Multi-Tenant POS & Accounting System API

        ## Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer YOUR_JWT_TOKEN
        \`\`\`

        ## Multi-Tenant Architecture
        - Super Admin: Access to all tenants and system analytics
        - Owner/Manager: Access to all data within their tenant
        - Cashier/Staff: Limited access based on role

        ## Modules
        - **FnB**: POS operations, products, transactions, inventory
        - **Accounting**: Full accounting system (COA, journals, reports, AP/AR)
        - **Admin**: Super admin analytics and billing
        - **Shared**: Auth, users, tenants, outlets
      `,
      contact: {
        name: 'MyPOS API Support',
        email: 'support@mypos.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.mypos.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Invalid request data'
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Products',
        description: 'Product management (FnB Module)'
      },
      {
        name: 'Transactions',
        description: 'POS transactions (FnB Module)'
      },
      {
        name: 'Inventory',
        description: 'Inventory management (FnB Module)'
      },
      {
        name: 'Categories',
        description: 'Category management'
      },
      {
        name: 'Customers',
        description: 'Customer management'
      },
      {
        name: 'Suppliers',
        description: 'Supplier management'
      },
      {
        name: 'Expenses',
        description: 'Expense tracking'
      },
      {
        name: 'Analytics',
        description: 'Business analytics and reports'
      },
      {
        name: 'Accounting',
        description: 'Accounting module endpoints'
      },
      {
        name: 'Admin',
        description: 'Super admin endpoints'
      },
      {
        name: 'Tenants',
        description: 'Tenant management'
      },
      {
        name: 'Users',
        description: 'User management'
      }
    ]
  },
  apis: [
    './src/modules/*/routes/*.ts',
    './src/modules/*/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
