import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";

const demoBlogs = [
  {
    id: "92000000-0000-4000-8000-000000000001",
    title: "আকাশ দেখে আবহাওয়া বোঝা",
    titleEn: "Reading the Weather in the Sky",
    content:
      "<p>আকাশের মেঘ, বাতাসের গতি এবং তাপমাত্রার পরিবর্তন আবহাওয়ার আগাম ধারণা দিতে পারে। প্রতিদিনের পর্যবেক্ষণ আমাদের সতর্ক থাকতে সাহায্য করে।</p>",
    contentEn:
      "<p>Clouds, wind direction, and temperature changes can offer useful clues about the weather. Observing them every day helps us stay aware and prepared.</p>",
  },
  {
    id: "92000000-0000-4000-8000-000000000002",
    title: "দুর্যোগের আগে পরিবারের প্রস্তুতি",
    titleEn: "Helping Families Prepare for Disasters",
    content:
      "<p>জরুরি নম্বর, শুকনো খাবার, বিশুদ্ধ পানি এবং প্রাথমিক চিকিৎসার সরঞ্জাম একসঙ্গে গুছিয়ে রাখলে দুর্যোগের সময় দ্রুত সিদ্ধান্ত নেওয়া সহজ হয়। পরিবারের সবাইকে পরিকল্পনাটি জানিয়ে রাখুন।</p>",
    contentEn:
      "<p>Keeping emergency contacts, dry food, clean water, and first-aid supplies together makes it easier to act quickly during a disaster. Make sure everyone in the family knows the plan.</p>",
  },
  {
    id: "92000000-0000-4000-8000-000000000003",
    title: "নিরাপদ কমিউনিটি গড়তে একসঙ্গে শেখা",
    titleEn: "Learning Together for a Safer Community",
    content:
      "<p>আবহাওয়া ও নিরাপত্তা নিয়ে শেখা বিষয়গুলো প্রতিবেশী ও বন্ধুদের সঙ্গে ভাগ করলে পুরো কমিউনিটি উপকৃত হয়। ছোট ছোট প্রস্তুতিই কঠিন সময়ে বড় সহায়তা হতে পারে।</p>",
    contentEn:
      "<p>Sharing what we learn about weather and safety with neighbours and friends benefits the whole community. Small steps taken early can make a big difference when conditions become difficult.</p>",
  },
];

async function seedBilingualBlogs() {
  const admin = await prisma.user.findFirst({
    where: { role: Role.admin },
    select: { id: true },
  });
  if (!admin) {
    console.log("No admin account found; bilingual blog samples were skipped.");
    return;
  }

  const created = await prisma.blogPost.createMany({
    data: demoBlogs.map((blog) => ({ ...blog, authorId: admin.id })),
    skipDuplicates: true,
  });
  console.log(
    `Added ${created.count} bilingual demo blog drafts for admin review.`,
  );
}

seedBilingualBlogs()
  .catch((error) => {
    console.error("Could not seed bilingual demo blogs:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
