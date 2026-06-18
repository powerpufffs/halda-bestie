// Common college-interview questions, sampled from the kinds of questions
// commonly asked across the top 100 universities (listed in TOP_UNIVERSITIES
// below). Used by the Interview Prep tool as a study reference alongside the
// live mock interview.

export type QuestionCategory =
  | "Getting to Know You"
  | "Academics & Intellect"
  | "Why This School & Fit"
  | "Character & Growth"
  | "Community & Activities"
  | "Looking Ahead & Closing";

/** Order categories are displayed in. */
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  "Getting to Know You",
  "Academics & Intellect",
  "Why This School & Fit",
  "Character & Growth",
  "Community & Activities",
  "Looking Ahead & Closing",
];

export interface CommonQuestion {
  question: string;
  /** What interviewers are really evaluating. */
  looking: string;
  category: QuestionCategory;
}

export const COMMON_QUESTIONS: CommonQuestion[] = [
  /* ----------------------------- Getting to Know You ---------------------- */
  {
    category: "Getting to Know You",
    question: "Tell me about yourself.",
    looking:
      "Self-awareness and what you choose to lead with — a throughline backed by a story, not a recap of your résumé.",
  },
  {
    category: "Getting to Know You",
    question: "How would your closest friends describe you?",
    looking:
      "Honest self-perception and the qualities you actually value in yourself — answered with a concrete example, not adjectives alone.",
  },
  {
    category: "Getting to Know You",
    question: "What's something about you that wouldn't show up on your application?",
    looking:
      "Dimension and authenticity — a genuine side of you that grades and activity lists can't capture.",
  },
  {
    category: "Getting to Know You",
    question: "What are you most proud of, and why?",
    looking:
      "Your values and how you define a meaningful accomplishment — effort and growth often land better than a trophy.",
  },

  /* --------------------------- Academics & Intellect ---------------------- */
  {
    category: "Academics & Intellect",
    question: "What do you want to study, and why?",
    looking:
      "Intellectual curiosity and genuine direction — the 'why' matters more than certainty about a major.",
  },
  {
    category: "Academics & Intellect",
    question: "Tell me about a class or idea that genuinely excited you.",
    looking:
      "An authentic love of learning over performing for grades — specifics about what hooked you.",
  },
  {
    category: "Academics & Intellect",
    question: "Who is a teacher or mentor who shaped you, and how?",
    looking:
      "Your capacity to learn from others and the kind of influence you seek out and absorb.",
  },
  {
    category: "Academics & Intellect",
    question: "What's a book, article, or idea you've kept thinking about long after finishing it?",
    looking:
      "An intellectual life beyond the syllabus — that you engage with ideas because they interest you.",
  },
  {
    category: "Academics & Intellect",
    question: "Tell me about a time you changed your mind about something important.",
    looking:
      "Open-mindedness and the ability to update your views with evidence rather than dig in.",
  },

  /* --------------------------- Why This School & Fit ---------------------- */
  {
    category: "Why This School & Fit",
    question: "Why are you interested in our university?",
    looking:
      "Genuine fit and demonstrated interest — name specific programs, professors, or traditions; avoid rankings and prestige.",
  },
  {
    category: "Why This School & Fit",
    question: "What would you take advantage of here that you couldn't get elsewhere?",
    looking:
      "That you've researched what makes the school distinctive and can picture using it.",
  },
  {
    category: "Why This School & Fit",
    question: "How do you see yourself fitting into our community?",
    looking:
      "A realistic sense of the campus culture and where you'd add to it, not just take from it.",
  },
  {
    category: "Why This School & Fit",
    question: "What hesitations or questions do you have about attending?",
    looking:
      "Honesty and mature, realistic thinking about fit — thoughtful concerns beat a polished non-answer.",
  },

  /* ----------------------------- Character & Growth ----------------------- */
  {
    category: "Character & Growth",
    question: "Tell me about a challenge or failure and what you learned from it.",
    looking:
      "Resilience and reflection — a real, specific obstacle and genuine growth, not manufactured drama.",
  },
  {
    category: "Character & Growth",
    question: "Describe a time you disagreed with someone. How did you handle it?",
    looking:
      "Maturity, empathy, and how you navigate conflict without steamrolling or shrinking away.",
  },
  {
    category: "Character & Growth",
    question: "When have you stepped outside your comfort zone?",
    looking:
      "A willingness to take risks and grow, and what you took from the discomfort.",
  },
  {
    category: "Character & Growth",
    question: "Tell me about a time you led others.",
    looking:
      "Your leadership style — how you bring people along, share credit, and handle responsibility.",
  },
  {
    category: "Character & Growth",
    question: "How do you handle stress or setbacks?",
    looking:
      "Self-regulation and concrete coping strategies — that you can function and recover under pressure.",
  },

  /* --------------------------- Community & Activities --------------------- */
  {
    category: "Community & Activities",
    question: "Which of your activities matters most to you, and why?",
    looking:
      "Depth of commitment over a long list — what you've invested in and what it's taught you.",
  },
  {
    category: "Community & Activities",
    question: "How have you contributed to a community you're part of?",
    looking:
      "A service mindset and real impact on others, not just titles or membership.",
  },
  {
    category: "Community & Activities",
    question: "Tell me about a cause or issue you care about.",
    looking:
      "Your values and how you engage with the wider world beyond your own goals.",
  },
  {
    category: "Community & Activities",
    question: "What do you do just for fun?",
    looking:
      "Authenticity, balance, and personality — be honest; it reveals who you are off the record.",
  },

  /* -------------------------- Looking Ahead & Closing --------------------- */
  {
    category: "Looking Ahead & Closing",
    question: "Where do you see yourself in ten years?",
    looking:
      "Direction and ambition held loosely — a sense of purpose without pretending the path is fixed.",
  },
  {
    category: "Looking Ahead & Closing",
    question: "What kind of impact do you hope to have?",
    looking:
      "A sense of purpose that reaches beyond yourself, grounded in what you already do.",
  },
  {
    category: "Looking Ahead & Closing",
    question: "Is there anything you wish I'd asked, or that you'd like to add?",
    looking:
      "Self-advocacy — the one thing you most want remembered, said without rambling.",
  },
  {
    category: "Looking Ahead & Closing",
    question: "What questions do you have for me?",
    looking:
      "Curiosity and preparation — ask something specific you genuinely couldn't just Google.",
  },
];

/**
 * The top 100 universities used as the sampling basis for the common questions
 * above — representative of the range of schools an applicant might interview
 * with. Ordering is approximate and not an endorsement of any one ranking.
 */
export const TOP_UNIVERSITIES: string[] = [
  "Princeton University",
  "Massachusetts Institute of Technology",
  "Harvard University",
  "Stanford University",
  "Yale University",
  "California Institute of Technology",
  "Duke University",
  "Johns Hopkins University",
  "Northwestern University",
  "University of Pennsylvania",
  "Cornell University",
  "University of Chicago",
  "Brown University",
  "Columbia University",
  "Dartmouth College",
  "University of California, Los Angeles",
  "University of California, Berkeley",
  "Rice University",
  "University of Notre Dame",
  "Vanderbilt University",
  "Carnegie Mellon University",
  "University of Michigan, Ann Arbor",
  "Washington University in St. Louis",
  "Emory University",
  "Georgetown University",
  "University of Virginia",
  "University of North Carolina at Chapel Hill",
  "University of Southern California",
  "University of California, San Diego",
  "New York University",
  "University of Florida",
  "The University of Texas at Austin",
  "Georgia Institute of Technology",
  "University of California, Davis",
  "University of California, Irvine",
  "University of Illinois Urbana-Champaign",
  "Boston College",
  "Tufts University",
  "University of Wisconsin–Madison",
  "Boston University",
  "The Ohio State University",
  "Rutgers University–New Brunswick",
  "University of Rochester",
  "University of California, Santa Barbara",
  "Purdue University",
  "University of Maryland, College Park",
  "Lehigh University",
  "Texas A&M University",
  "University of Georgia",
  "University of Washington",
  "Wake Forest University",
  "Case Western Reserve University",
  "Northeastern University",
  "Virginia Tech",
  "Florida State University",
  "William & Mary",
  "University of Minnesota, Twin Cities",
  "Brandeis University",
  "Tulane University",
  "Pennsylvania State University",
  "University of Miami",
  "Villanova University",
  "Pepperdine University",
  "University of California, Riverside",
  "Santa Clara University",
  "University of Connecticut",
  "University of Pittsburgh",
  "Syracuse University",
  "University of Massachusetts Amherst",
  "Indiana University Bloomington",
  "Michigan State University",
  "Stony Brook University",
  "University of California, Santa Cruz",
  "Rensselaer Polytechnic Institute",
  "George Washington University",
  "University of Delaware",
  "American University",
  "Clemson University",
  "Fordham University",
  "Southern Methodist University",
  "Baylor University",
  "Brigham Young University",
  "University of Colorado Boulder",
  "North Carolina State University",
  "University of Arizona",
  "Marquette University",
  "Stevens Institute of Technology",
  "Worcester Polytechnic Institute",
  "University of San Diego",
  "Loyola Marymount University",
  "University of Iowa",
  "Howard University",
  "University of California, Merced",
  "Gonzaga University",
  "University of Vermont",
  "Drexel University",
  "University of Tennessee, Knoxville",
  "Auburn University",
  "Binghamton University",
  "University of Oregon",
];
