import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "../components/LogoutButton";

const ADMIN_TOKEN_COOKIE = "admin_token";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
  const expectedToken = process.env.ADMIN_API_TOKEN;

  // Check authorization (server-side)
  if (!adminToken || !expectedToken || adminToken !== expectedToken) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                FREULY Admin
              </Link>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/leads"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Leads
            </Link>
            <Link
              href="/admin/service-requests"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Service requests
            </Link>
            <Link
              href="/admin/specialists"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Specialists
            </Link>
            <Link
              href="/admin/partners"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Partners
            </Link>
            <Link
              href="/admin/campaign-links"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Campaign Links
            </Link>
            <Link
              href="/admin/campaign-links"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Campaign links
            </Link>
            <Link
              href="/admin/site-blocks"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Site Blocks
            </Link>
            <Link
              href="/admin/content/posts"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Content Hub
            </Link>
            <Link
              href="/admin/content/homepage/social-insights"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              Homepage • Social Insights
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

