import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-sand">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
