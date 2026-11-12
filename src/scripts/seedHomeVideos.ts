import { prisma } from "../lib/prisma";

// Demo rows use one known sample video and varied thumbnails so the carousel can be reviewed.
const sampleVideoLink = "https://www.youtube.com/watch?v=s5c05_s-J3I";
const thumbnailImages = [
  "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
];

async function seedHomeVideos() {
  const videos = thumbnailImages.map((thumbnailImage, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: `ডেমো ভিডিও ${number}`,
      title: `হোম ভিডিও সেকশন পরীক্ষার নমুনা ${number} — অ্যাডমিন থেকে আসল ভিডিও দিন`,
      nameEn: "Demo video " + number,
      titleEn:
        "Sample home video description " +
        number +
        " - replace this with the real video description.",
      videoLink: sampleVideoLink,
      thumbnailImage,
    };
  });
  await Promise.all(
    videos.map(({ id, ...video }) =>
      prisma.homeVideo.upsert({
        where: { id },
        create: { id, ...video },
        update: { nameEn: video.nameEn, titleEn: video.titleEn },
      }),
    ),
  );

  console.log(
    `Seeded ${videos.length} bilingual demo home videos. Existing sample videos received English copy.`,
  );
}

seedHomeVideos()
  .catch((error) => {
    console.error("Could not seed home videos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
