import { getCollectionInfo } from '../../chroma/index.js'
import { muted, printKeyValue, printSection } from '../ui.js'

export async function handleDbInfoCommand(): Promise<void> {
  const info = await getCollectionInfo()

  printSection('Database Info')
  printKeyValue('Base URL:', info.baseUrl)
  printKeyValue('Tenant:', info.tenant)
  printKeyValue('Database:', info.database)
  printKeyValue('Collection:', info.name)
  printKeyValue('Exists:', info.exists ? 'yes' : 'no')
  printKeyValue('Collection ID:', info.id || muted('none'))
  printKeyValue('Records:', String(info.recordCount))
}
