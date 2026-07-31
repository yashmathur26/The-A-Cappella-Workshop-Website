import { MapPin } from "lucide-react";
import { StaffAvatar } from "@/components/StaffAvatar";
import { ROSTER, type CampWeek, type StaffMember } from "@/lib/staff-roster";

function TeacherCell({ person }: { person: StaffMember }) {
  return (
    <div className="flex flex-col items-center text-center w-32 sm:w-40">
      <StaffAvatar name={person.name} photo={person.photo} variant="teacher" />
      <p className="mt-3 text-base sm:text-lg font-semibold text-white text-balance">
        {person.name}
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-custom/90">
        Teacher
      </p>
    </div>
  );
}

function TaCell({ person }: { person: StaffMember }) {
  return (
    <div className="flex flex-col items-center text-center w-24 sm:w-28">
      <StaffAvatar name={person.name} photo={person.photo} variant="ta" />
      <p className="mt-2.5 text-sm font-medium text-white/90 text-balance">
        {person.name}
      </p>
    </div>
  );
}

function WeekSection({ week }: { week: CampWeek }) {
  return (
    // Flat card (no backdrop-filter) + content-visibility so off-screen weeks
    // skip layout/paint — keeps scrolling smooth with many photos on screen.
    <section className="staff-card cv-auto rounded-2xl p-6 sm:p-9">
      {/* Week header — orients the eye before the people */}
      <header className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-custom/80">
          Week {week.number}
        </p>
        <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
          {week.dates}
        </h2>
        <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-sm text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            {week.venue}
          </span>
          <span aria-hidden className="text-white/20">•</span>
          <span>
            {week.teachers.length} {week.teachers.length === 1 ? "teacher" : "teachers"}
            {" · "}
            {week.tas.length} TAs
          </span>
        </div>
      </header>

      {/* Teachers — the focal group, larger */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-9">
        {week.teachers.map((t, i) => (
          <TeacherCell key={`${week.id}-t-${t.key}-${i}`} person={t} />
        ))}
      </div>

      {/* Teaching assistants — secondary tier, smaller and denser */}
      {week.tas.length > 0 && (
        <div className="mt-9 pt-7 border-t border-white/10">
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Teaching Assistants
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
            {week.tas.map((a, i) => (
              <TaCell key={`${week.id}-a-${a.key}-${i}`} person={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function Staff() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10 lg:py-14">
        {/* Page header */}
        <header className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-custom/80">
            Summer 2026 · Lexington
          </p>
          <h1 className="mt-2 text-4xl lg:text-5xl font-bold gradient-text tracking-tight text-balance">
            Meet Our Teachers &amp; TAs
          </h1>
          <p className="mt-4 text-lg text-white/70 text-pretty">
            The exceptional student musicians leading The&nbsp;&rsquo;Shop this
            summer, week by week. Teachers lead each session; teaching assistants
            support every group along the way.
          </p>
        </header>

        {/* Weeks stack vertically — each is its own block as you scroll */}
        <div className="space-y-8 lg:space-y-10">
          {ROSTER.map((week) => (
            <WeekSection key={week.id} week={week} />
          ))}
        </div>
      </div>
    </div>
  );
}
