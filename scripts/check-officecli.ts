import { validateWithOfficeCli } from '../server/services/office-cli'

const result = await validateWithOfficeCli('non-existent.pptx', process.env.OFFICECLI_BIN)
console.log(result)
if (!result.available) {
  console.error('OfficeCLI is not installed or not on PATH.')
  process.exit(1)
}
