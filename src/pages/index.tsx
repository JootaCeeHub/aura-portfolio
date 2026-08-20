import CorePanel from '../components/CorePanel'
import CognitiveMap from '../components/CognitiveMap'
import ConsolePanel from '../components/Console'
import ModulesTable from '../components/ModulesTable'
import LogsPanel from '../components/LogsPanel'
import Onboarding from '../components/Onboarding'

export default function Home() {
  const hasMCPs = false // placeholder: conectar con backend/hook real
  return (
    <main className="p-6 grid grid-cols-12 gap-6">
      <section className="col-span-3">
        <CorePanel />
        <ModulesTable />
      </section>

      <section className="col-span-6 space-y-6">
        {hasMCPs ? <CognitiveMap /> : <Onboarding />}
        <ConsolePanel />
      </section>

      <section className="col-span-3 space-y-6">
        <LogsPanel />
      </section>
    </main>
  )
}
