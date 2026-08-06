export interface FormFieldPreset {
  field_name: string;
  field_label: string;
  field_type: "text" | "number" | "email" | "tel" | "select" | "textarea" | "checkbox" | "radio" | "date" | "time" | "file" | "url" | "rating";
  required: boolean;
  field_options?: string[];
  conditional_rules?: any[];
}

export interface TemplatePreset {
  name: string;
  description: string;
  theme: string;
  default_form_fields: FormFieldPreset[];
  default_automation: {
    triggers: string[];
    steps: { name: string; delay: string; channel: string }[];
  };
  default_landing_page: {
    sections: string[];
    faq: { q: string; a: string }[];
    agenda: { time: string; title: string; desc: string }[];
  };
}

export interface CategoryPreset {
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories: TemplatePreset[];
}

export const builtInCategories: CategoryPreset[] = [
  {
    name: "Education & Tech",
    icon: "GraduationCap",
    color: "#3b82f6",
    description: "Hackathons, Workshops, Bootcamps, Seminars & College Fests",
    subcategories: [
      {
        name: "Hackathon",
        description: "Full registration with GitHub, LinkedIn, Resume, Skills & Project Idea",
        theme: "Hackathon",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "college", field_label: "College / University", field_type: "text", required: true },
          { field_name: "department", field_label: "Department / Stream", field_type: "text", required: true },
          { field_name: "year", field_label: "Year of Study", field_type: "select", required: true, field_options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated"] },
          { field_name: "github", field_label: "GitHub Profile URL", field_type: "url", required: true },
          { field_name: "linkedin", field_label: "LinkedIn Profile URL", field_type: "url", required: false },
          { field_name: "portfolio", field_label: "Portfolio URL", field_type: "url", required: false },
          { field_name: "skills", field_label: "Primary Skills & Stack", field_type: "text", required: true },
          { field_name: "experience", field_label: "Years of Coding Experience", field_type: "number", required: true },
          { field_name: "project_idea", field_label: "Project Idea / Hack Concept", field_type: "textarea", required: true },
          { field_name: "why_select", field_label: "Why should we select you?", field_type: "textarea", required: true }
        ],
        default_automation: {
          triggers: ["registration", "approval", "reminder", "checkin"],
          steps: [
            { name: "Registration Confirmation", delay: "instant", channel: "WhatsApp" },
            { name: "Approval Ticket Activation", delay: "on approval", channel: "WhatsApp" }
          ]
        },
        default_landing_page: {
          sections: ["Banner", "Countdown", "About", "Agenda", "FAQ", "Registration"],
          faq: [
            { q: "Who can participate?", a: "Students, developers and designers passionate about building software." }
          ],
          agenda: [
            { time: "09:00 AM", title: "Registrations & Reporting", desc: "Scan QR badge at check-in counter." }
          ]
        }
      },
      {
        name: "Workshop",
        description: "Hands-on technical skill building sessions",
        theme: "Education",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "skills", field_label: "Current Skill Level", field_type: "select", required: true, field_options: ["Beginner", "Intermediate", "Advanced"] },
          { field_name: "why_join", field_label: "What do you hope to learn?", field_type: "textarea", required: false }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "College Fest",
        description: "Cultural and inter-college event competitions",
        theme: "Festive",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "college", field_label: "College / Institute", field_type: "text", required: true },
          { field_name: "events_participating", field_label: "Events Participating In", field_type: "text", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Bootcamp",
        description: "Intensive multi-day training programs",
        theme: "Dark",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "linkedin", field_label: "LinkedIn Profile URL", field_type: "url", required: false },
          { field_name: "motivation", field_label: "Bootcamp Commitment & Goals", field_type: "textarea", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      }
    ]
  },
  {
    name: "Corporate & Business",
    icon: "Briefcase",
    color: "#0ea5e9",
    description: "Conferences, Seminars, Startup Pitches, Interviews & Meetings",
    subcategories: [
      {
        name: "Conference",
        description: "Professional multi-track corporate conferences",
        theme: "Corporate",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Corporate Email", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "company", field_label: "Company / Organization", field_type: "text", required: true },
          { field_name: "designation", field_label: "Designation / Role", field_type: "text", required: true },
          { field_name: "linkedin", field_label: "LinkedIn URL", field_type: "url", required: false }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Agenda", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Seminar",
        description: "Keynote talks and industry knowledge sessions",
        theme: "Minimal",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "organization", field_label: "Organization / University", field_type: "text", required: false }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Startup Pitch",
        description: "Demoday and investor pitch presentations",
        theme: "Executive",
        default_form_fields: [
          { field_name: "name", field_label: "Founder Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Work Email", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "startup_name", field_label: "Startup / Project Name", field_type: "text", required: true },
          { field_name: "pitch_deck", field_label: "Pitch Deck URL", field_type: "url", required: true },
          { field_name: "traction", field_label: "Current Revenue / Traction Summary", field_type: "textarea", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Interview",
        description: "Hiring drives and candidate interviews",
        theme: "Corporate",
        default_form_fields: [
          { field_name: "name", field_label: "Candidate Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "Mobile Number", field_type: "tel", required: true },
          { field_name: "resume", field_label: "Resume URL / Link", field_type: "url", required: true },
          { field_name: "experience", field_label: "Years of Experience", field_type: "number", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Corporate Meeting",
        description: "Internal and client strategic meetings",
        theme: "Minimal",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Corporate Email", field_type: "email", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "Registration"], faq: [], agenda: [] }
      }
    ]
  },
  {
    name: "Health & Lifestyle",
    icon: "Heart",
    color: "#10b981",
    description: "Medical Camps, Salon Bookings & Fitness",
    subcategories: [
      {
        name: "Medical Camp",
        description: "Health drives and patient registrations",
        theme: "Minimal",
        default_form_fields: [
          { field_name: "name", field_label: "Patient Full Name", field_type: "text", required: true },
          { field_name: "age", field_label: "Age", field_type: "number", required: true },
          { field_name: "gender", field_label: "Gender", field_type: "select", required: true, field_options: ["Male", "Female", "Other"] },
          { field_name: "blood_group", field_label: "Blood Group", field_type: "select", required: true, field_options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] },
          { field_name: "phone", field_label: "Mobile Number", field_type: "tel", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Salon Booking",
        description: "Appointment bookings for beauty and grooming",
        theme: "Luxury",
        default_form_fields: [
          { field_name: "name", field_label: "Client Full Name", field_type: "text", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "service", field_label: "Service Requested", field_type: "select", required: true, field_options: ["Haircut & Styling", "Facial & Skincare", "Manicure / Pedicure", "Full Package"] },
          { field_name: "preferred_time", field_label: "Preferred Time Slot", field_type: "text", required: true }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      }
    ]
  },
  {
    name: "Social & Sports",
    icon: "Trophy",
    color: "#f59e0b",
    description: "Sports Tournaments & Wedding Celebrations",
    subcategories: [
      {
        name: "Sports",
        description: "Marathons, tournaments and competitive matches",
        theme: "Professional",
        default_form_fields: [
          { field_name: "name", field_label: "Athlete Name", field_type: "text", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "team", field_label: "Team Name / Free Agent", field_type: "text", required: true },
          { field_name: "category", field_label: "Division / Category", field_type: "select", required: true, field_options: ["Open Men", "Open Women", "Under-19", "Veterans"] }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      },
      {
        name: "Wedding",
        description: "Wedding receptions and guest RSVP tracking",
        theme: "Wedding",
        default_form_fields: [
          { field_name: "name", field_label: "Guest Full Name", field_type: "text", required: true },
          { field_name: "phone", field_label: "WhatsApp Phone", field_type: "tel", required: true },
          { field_name: "guests", field_label: "Total Guests Attending", field_type: "number", required: true },
          { field_name: "food", field_label: "Dietary Preference", field_type: "select", required: true, field_options: ["Vegetarian", "Non-Vegetarian", "Jain / Special Diet"] }
        ],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      }
    ]
  }
];

