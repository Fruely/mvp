"use client";

import Link from "next/link";
import {
  PARTNER_PROGRAM_GUIDE_SECTIONS,
  PARTNER_PROGRAM_GUIDE_TITLE,
  PARTNER_PROGRAM_LINK_TYPE_ROWS,
} from "@/lib/admin/partnerProgramGuideRu";

export default function AdminPartnerGuideContent() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">{PARTNER_PROGRAM_GUIDE_TITLE}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Пошаговое руководство для сотрудников Freuly. Если что-то непонятно — начните с раздела
          «Партнёры» в меню слева.
        </p>
      </header>

      {PARTNER_PROGRAM_GUIDE_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="mt-2 text-sm text-gray-700">
              {p}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.warning ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {section.warning}
            </p>
          ) : null}
        </section>
      ))}

      <section className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Тип</th>
              <th className="px-3 py-2">Пример</th>
              <th className="px-3 py-2">Назначение</th>
            </tr>
          </thead>
          <tbody>
            {PARTNER_PROGRAM_LINK_TYPE_ROWS.map((row) => (
              <tr key={row.type} className="border-b last:border-0 align-top">
                <td className="px-3 py-2 font-medium text-gray-900">{row.type}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.example}</td>
                <td className="px-3 py-2 text-gray-700">{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-sm text-gray-600">
        Вернуться к работе:{" "}
        <Link href="/admin/partners" className="font-medium text-indigo-600 hover:underline">
          Партнёры
        </Link>
      </p>
    </div>
  );
}
