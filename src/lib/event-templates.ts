export interface FormFieldPreset {
  field_name: string;
  field_label: string;
  field_type: "text" | "number" | "email" | "tel" | "select" | "textarea" | "checkbox";
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
    name: "Education",
    icon: "GraduationCap",
    color: "#3b82f6", // Blue
    description: "Workshops, Seminars, Bootcamps and College events",
    subcategories: [
      {
        name: "Hackathon",
        description: "Preload team-details, year, and GitHub repository registration",
        theme: "Hackathon",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true },
          { field_name: "college", field_label: "College Name", field_type: "text", required: true },
          { field_name: "team_name", field_label: "Team Name", field_type: "text", required: true },
          { field_name: "github", field_label: "GitHub Profile URL", field_type: "text", required: false },
          { field_name: "linkedin", field_label: "LinkedIn Profile URL", field_type: "text", required: false }
        ],
        default_automation: {
          triggers: ["registration", "reminder", "checkin", "certificate"],
          steps: [
            { name: "Registration Confirmation", delay: "instant", channel: "WhatsApp" },
            { name: "24h Event Reminder", delay: "24 hours before", channel: "WhatsApp" },
            { name: "Check-in Welcome", delay: "on check-in", channel: "WhatsApp" },
            { name: "Alumni Certificate", delay: "after event", channel: "Email" }
          ]
        },
        default_landing_page: {
          sections: ["Banner", "Countdown", "About", "Agenda", "Sponsors", "FAQ", "Registration"],
          faq: [
            { q: "Who can participate?", a: "Any student currently enrolled in college or bootcamp." },
            { q: "Is there a registration fee?", a: "No, this event is completely free." }
          ],
          agenda: [
            { time: "09:00 AM", title: "Registrations & Reporting", desc: "Collect QR badge at check-in counter." },
            { time: "10:30 AM", title: "Keynote & Topic Announcement", desc: "Unveiling event theme." }
          ]
        }
      },
      {
        name: "Workshop",
        description: "Interactive skill-building session",
        theme: "Education",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true }
        ],
        default_automation: {
          triggers: ["registration", "reminder"],
          steps: [
            { name: "Welcome Pack", delay: "instant", channel: "Email" }
          ]
        },
        default_landing_page: {
          sections: ["Banner", "About", "Agenda", "Registration"],
          faq: [],
          agenda: []
        }
      }
    ]
  },
  {
    name: "Corporate",
    icon: "Briefcase",
    color: "#0ea5e9", // Sky
    description: "Conferences, product launches, client and team meetings",
    subcategories: [
      {
        name: "Conference",
        description: "Corporate conferences and seminars",
        theme: "Corporate",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "company", field_label: "Company / Organization", field_type: "text", required: true },
          { field_name: "designation", field_label: "Designation / Role", field_type: "text", required: false }
        ],
        default_automation: {
          triggers: ["registration", "reminder", "checkin"],
          steps: []
        },
        default_landing_page: {
          sections: ["Banner", "About", "Speakers", "Agenda", "Sponsors", "Registration"],
          faq: [],
          agenda: []
        }
      }
    ]
  },
  {
    name: "Technology",
    icon: "Cpu",
    color: "#a855f7", // Purple
    description: "AI meetups, startup networking and product demos",
    subcategories: [
      {
        name: "Developer Meetup",
        description: "Tech talks and startup demo days",
        theme: "Dark",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true },
          { field_name: "experience", field_label: "Years of Experience", field_type: "number", required: false }
        ],
        default_automation: {
          triggers: ["registration", "reminder"],
          steps: []
        },
        default_landing_page: {
          sections: ["Banner", "About", "Agenda", "FAQ", "Registration"],
          faq: [],
          agenda: []
        }
      }
    ]
  },
  {
    name: "Wedding",
    icon: "Heart",
    color: "#ec4899", // Pink
    description: "Family functions, receptions and engagements",
    subcategories: [
      {
        name: "Wedding Reception",
        description: "Track guests, preferences, and thank-you notes",
        theme: "Wedding",
        default_form_fields: [
          { field_name: "name", field_label: "Primary Guest Name", field_type: "text", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true },
          { field_name: "guests", field_label: "Number of Guests (Including you)", field_type: "number", required: true },
          { 
            field_name: "food", 
            field_label: "Food Preference", 
            field_type: "select", 
            required: true,
            field_options: ["Vegetarian", "Non-Vegetarian", "Allergies / Special Diet"] 
          }
        ],
        default_automation: {
          triggers: ["invitation", "reminder", "thank_you"],
          steps: [
            { name: "Digital Invitation Card", delay: "instant", channel: "WhatsApp" },
            { name: "Location Pin Reminder", delay: "4 hours before", channel: "WhatsApp" },
            { name: "Thanks for Blessings", delay: "next morning", channel: "WhatsApp" }
          ]
        },
        default_landing_page: {
          sections: ["Banner", "Countdown", "About", "Venue", "Registration"],
          faq: [
            { q: "Is parking available?", a: "Yes, valet parking is available at the resort entry." }
          ],
          agenda: [
            { time: "06:30 PM", title: "Groom & Bride Entry", desc: "Welcome band presentation." },
            { time: "08:00 PM", title: "Buffet Dinner", desc: "Traditional fusion spread." }
          ]
        }
      }
    ]
  },
  {
    name: "Healthcare",
    icon: "Activity",
    color: "#10b981", // Emerald
    description: "Medical camps, blood donations and vaccination drives",
    subcategories: [
      {
        name: "Medical Camp",
        description: "Preload age, blood groups, and appointment reminders",
        theme: "Minimal",
        default_form_fields: [
          { field_name: "name", field_label: "Patient Full Name", field_type: "text", required: true },
          { field_name: "age", field_label: "Age", field_type: "number", required: true },
          { 
            field_name: "gender", 
            field_label: "Gender", 
            field_type: "select", 
            required: true,
            field_options: ["Male", "Female", "Other"] 
          },
          { 
            field_name: "blood_group", 
            field_label: "Blood Group", 
            field_type: "select", 
            required: true,
            field_options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] 
          },
          { field_name: "phone", field_label: "Mobile Number", field_type: "tel", required: true }
        ],
        default_automation: {
          triggers: ["appointment", "reminder", "report_ready"],
          steps: [
            { name: "Token Confirmation", delay: "instant", channel: "WhatsApp" },
            { name: "Camp Report Available", delay: "on report update", channel: "WhatsApp" }
          ]
        },
        default_landing_page: {
          sections: ["Banner", "About", "Venue", "Registration"],
          faq: [
            { q: "What should I bring?", a: "Please bring a copy of any previous prescriptions or identity documents." }
          ],
          agenda: []
        }
      }
    ]
  },
  {
    name: "Sports",
    icon: "Trophy",
    color: "#f59e0b", // Amber
    description: "Marathons, tournaments and indoor matches",
    subcategories: [
      {
        name: "Tournament",
        description: "Team sports and competitive matches",
        theme: "Professional",
        default_form_fields: [
          { field_name: "name", field_label: "Player Name", field_type: "text", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true },
          { field_name: "team", field_label: "Team Name / Free Agent", field_type: "text", required: true }
        ],
        default_automation: {
          triggers: ["registration", "reminder"],
          steps: []
        },
        default_landing_page: {
          sections: ["Banner", "Countdown", "About", "Agenda", "Registration"],
          faq: [],
          agenda: []
        }
      }
    ]
  },
  {
    name: "Entertainment",
    icon: "Music",
    color: "#f43f5e", // Rose
    description: "Concerts, DJ nights and movie screenings",
    subcategories: []
  },
  {
    name: "Community",
    icon: "Users",
    color: "#14b8a6", // Teal
    description: "Volunteer drives, NGOs and awareness campaigns",
    subcategories: []
  },
  {
    name: "Other",
    icon: "Sparkles",
    color: "#64748b", // Slate
    description: "Custom events configured specifically to your needs",
    subcategories: [
      {
        name: "Custom Event",
        description: "Blank canvas with standard contact fields",
        theme: "Minimal",
        default_form_fields: [
          { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
          { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
          { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true }
        ],
        default_automation: {
          triggers: ["registration"],
          steps: []
        },
        default_landing_page: {
          sections: ["Banner", "About", "Registration"],
          faq: [],
          agenda: []
        }
      }
    ]
  }
];
