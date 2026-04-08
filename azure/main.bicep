targetScope = 'resourceGroup'

@description('Nombre del proyecto (ej: urbia)')
param projectName string = 'urbia'

@description('Región compatible para todos los recursos')
param location string = 'centralus'

@description('API Key para autenticación del backend')
@secure()
param apiKey string

@description('Imagen de contenedor para la API .NET')
param apiContainerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Contraseña del admin de PostgreSQL')
@secure()
param dbPassword string

@description('Contraseña del Azure Container Registry')
@secure()
param acrPassword string

var tags = {
  project: projectName
  environment: 'production'
  costProfile: 'low-cost'
}
var suffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName))
var staticWebAppName = '${projectName}-${suffix}-web'
var containerEnvironmentName = '${projectName}-${suffix}-cae'
var containerAppName = '${projectName}-${suffix}-api'
var logAnalyticsName = '${projectName}-${suffix}-law'
var dbServerName = '${projectName}-${suffix}-db'
var dbName = 'propintel'
var dbUser = 'urbiaadmin'

// ── Log Analytics ─────────────────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: tags
}

// ── Static Web App (Angular) ──────────────────────────────────────────────────
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: 'centralus'
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
  tags: tags
}

// ── PostgreSQL Flexible Server ────────────────────────────────────────────────
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: dbServerName
  location: location
  sku: {
    name: 'Standard_B1ms'   // Burstable — ~7€/mes
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: dbUser
    administratorLoginPassword: dbPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    version: '16'
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
  tags: tags
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: dbName
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// Permitir acceso desde Azure Services (Container Apps)
resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
resource containerEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
  tags: tags
}

// ── Container App (API .NET) ──────────────────────────────────────────────────
var dbConnectionString = 'Host=${postgresServer.properties.fullyQualifiedDomainName};Database=${dbName};Username=${dbUser};Password=${dbPassword};SSL Mode=Require;Trust Server Certificate=true'

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      activeRevisionsMode: 'Single'
      registries: [
        {
          server: 'urbiaacr2026.azurecr.io'
          username: 'urbiaacr2026'
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'api-key'
          value: apiKey
        }
        {
          name: 'db-connection'
          value: dbConnectionString
        }
        {
          name: 'acr-password'
          value: acrPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiContainerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://+:8080'
            }
            {
              name: 'ApiKey'
              secretRef: 'api-key'
            }
            {
              name: 'ConnectionStrings__UrbIA'
              secretRef: 'db-connection'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
  tags: tags
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output resourceGroupName string = resourceGroup().name
output staticWebAppName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output containerAppName string = containerApp.name
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output dbConnectionStringForScraper string = 'Host=${postgresServer.properties.fullyQualifiedDomainName};Port=5432;Database=${dbName};Username=${dbUser};Password=<TU_PASSWORD>'
