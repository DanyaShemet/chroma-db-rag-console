import { deleteCollection, getCollectionName } from '../../chroma/index.js'
import { success, warning } from '../ui.js'

export async function handleDbDropCommand(): Promise<void> {
  const deleted = await deleteCollection()

  if (!deleted) {
    console.log(warning(`Collection ${getCollectionName()} does not exist.`))
    return
  }

  console.log(success(`Deleted collection ${getCollectionName()}.`))
}
