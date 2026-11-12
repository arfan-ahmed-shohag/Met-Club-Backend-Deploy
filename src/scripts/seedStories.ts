import { prisma } from "../lib/prisma";

const demoStories = [
  {
    id: "91000000-0000-4000-8000-000000000001",
    quoteBn:
      "মেট ক্লাবের সঙ্গে শিখে এখন আবহাওয়ার সংকেত বুঝতে পারি এবং দুর্যোগের আগেই প্রস্তুতি নিতে পারি। পরিবারের সবার সঙ্গে নিরাপদ থাকার উপায়ও ভাগ করি।",
    quoteEn:
      "With MET Club, I learned to understand weather signals and get ready before a disaster. I can now share safer choices with my family.",
    authorNameBn: "মেট ক্লাবের শিক্ষার্থী",
    authorNameEn: "MET Club learner",
    authorDetailBn: "শিক্ষার্থী",
    authorDetailEn: "Student",
    imageUrl: "/story-assets/learning-zone-cutout.webp",
  },
  {
    id: "91000000-0000-4000-8000-000000000002",
    quoteBn:
      "হাতে-কলমে শেখার পর এখন আবহাওয়ার পরিবর্তন খেয়াল করি এবং কমিউনিটিকে প্রস্তুত থাকতে সাহায্য করি।",
    quoteEn:
      "Hands-on learning helped me notice changing weather and support my community in staying prepared.",
    authorNameBn: "কমিউনিটির অংশগ্রহণকারী",
    authorNameEn: "Community participant",
    authorDetailBn: "শিক্ষার্থী",
    authorDetailEn: "Learner",
    imageUrl: "/story-assets/citizen-science-cutout.webp",
  },
  {
    id: "91000000-0000-4000-8000-000000000003",
    quoteBn:
      "একসাথে শিখে বুঝেছি, প্রস্তুত কমিউনিটি আবহাওয়ার ঝুঁকি বুঝে নিরাপদে সাড়া দিতে পারে।",
    quoteEn:
      "We learned together how a prepared community can understand risks and respond safely to extreme weather.",
    authorNameBn: "স্কুলের অংশগ্রহণকারী",
    authorNameEn: "School participant",
    authorDetailBn: "শিক্ষার্থী",
    authorDetailEn: "Student",
    imageUrl: "/story-assets/practice-zone-cutout.webp",
  },
];

async function seedStories() {
  const created = await prisma.story.createMany({
    data: demoStories,
    skipDuplicates: true,
  });
  console.log(
    `Added ${created.count} demo stories. Existing entries were left unchanged.`,
  );
}

seedStories()
  .catch((error) => {
    console.error("Could not seed stories:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
