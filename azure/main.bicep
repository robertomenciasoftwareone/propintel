targetScope = 'resourceGroup'

@description('Nombre del proyecto (ej: urbia)')
param projectName string = 'urbia'

@description('Región compatible para todos los recursos (recomendado: centralus)')
param location string = 'centralus'

@description('API Key para autenticación del backend')
@secure()
param apiKey string

@description('Imagen de contenedor para la API .NET')
param apiContainerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Activar Free Tier de Cosmos DB (solo 1 cuenta por suscripción)')
param cosmosEnableFreeTier bool = false

var tags = {
  project: projectName
  environment: 'production'
  costProfile: 'low-cost'
}
var suffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName))
var staticWebAppName = '${projectName}-${suffix}-web'
var cosmosAccountName = '${projectName}${suffix}cosmos'
var containerEnvironmentName = '${projectName}-${suffix}-cae'
var containerAppName = '${projectName}-${suffix}-api'
var logAnalyticsName = '${projectName}-${suffix}-law'

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
  tags: tags
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: cosmosEnableFreeTier
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
  tags: tags
}

resource cosmosSqlDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDb
  name: 'propintel'
  properties: {
    resource: {
      id: 'propintel'
    }
  }
}

resource cosmosSqlContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosSqlDb
  name: 'items'
  properties: {
    resource: {
      id: 'items'
      partitionKey: {
        paths: [
          '/pk'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

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

resource containerEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: listKeys(logAnalytics.id, logAnalytics.apiVersion).primarySharedKey
      }
    }
  }
  tags: tags
}

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
      secrets: [
        {
          name: 'api-key'
          value: apiKey
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
              name: 'ConnectionStrings__Cosmos'
              value: 'AccountEndpoint=${cosmosDb.properties.documentEndpoint};AccountKey=${listKeys(cosmosDb.id, cosmosDb.apiVersion).primaryMasterKey};'
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

output resourceGroupName string = resourceGroup().name
output staticWebAppName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output containerAppName string = containerApp.name
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output cosmosDbAccountName string = cosmosDb.name
output cosmosDbEndpoint string = cosmosDb.properties.documentEndpoint
