import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";

const outputDirectory = path.join(process.cwd(), "uploads", "pdf-resources");
const sampleResources = [
  {
    id: "93000000-0000-4000-8000-000000000001",
    category: "comics" as const,
    titleBn: "আবহাওয়া ও নিরাপত্তা কমিকস",
    titleEn: "Weather and Safety Comics",
    descriptionBn: "কমিকসের গল্পে আবহাওয়ার সংকেত ও নিরাপদ থাকার উপায় জানুন।",
    descriptionEn: "Learn about weather signals and safety through a short illustrated story.",
    pdfUrl: "/uploads/pdf-resources/sample-comics.pdf",
    heading: "MET Club - Weather and Safety Comics",
    summary: "Sample publication: notice changing weather, listen to trusted alerts, and make a family safety plan.",
  },
  {
    id: "93000000-0000-4000-8000-000000000002",
    category: "flyer" as const,
    titleBn: "দুর্যোগ প্রস্তুতি ফ্লায়ার",
    titleEn: "Disaster Preparedness Flyer",
    descriptionBn: "জরুরি সময়ের প্রস্তুতি ও প্রয়োজনীয় যোগাযোগের তথ্য একসাথে রাখুন।",
    descriptionEn: "A quick guide to emergency supplies, contacts, and preparedness.",
    pdfUrl: "/uploads/pdf-resources/sample-flyer.pdf",
    heading: "MET Club - Disaster Preparedness Flyer",
    summary: "Sample publication: prepare clean water, dry food, a first-aid kit, emergency contacts, and a family meeting point.",
  },
  {
    id: "93000000-0000-4000-8000-000000000003",
    category: "pressRelease" as const,
    titleBn: "মেট ক্লাবের কার্যক্রম: প্রেস রিলিজ",
    titleEn: "MET Club Activities - Press Release",
    descriptionBn: "আবহাওয়া শিক্ষা ও কমিউনিটির নিরাপত্তা নিয়ে মেট ক্লাবের উদ্যোগ সম্পর্কে পড়ুন।",
    descriptionEn: "An overview of MET Club initiatives in weather education and community safety.",
    pdfUrl: "/uploads/pdf-resources/sample-press-release.pdf",
    heading: "MET Club - Sample Press Release",
    summary: "Sample publication: MET Club supports weather education and community preparedness through learning activities and local participation.",
  },
];

function createPdf(lines: string[]) {
  const escapePdfText = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const commands = ["BT", "/F1 18 Tf", "72 740 Td", `(${escapePdfText(lines[0])}) Tj`, "/F1 11 Tf", "0 -36 Td", `(${escapePdfText(lines[1])}) Tj`, "0 -24 Td", "(This is sample seed content. Replace it with the approved publication.) Tj", "ET"].join("\n");
  const stream = Buffer.from(commands, "ascii");
  const objects = [
    Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "ascii"),
    Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", "ascii"),
    Buffer.from("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n", "ascii"),
    Buffer.from("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n", "ascii"),
    Buffer.concat([Buffer.from(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "ascii"), stream, Buffer.from("\nendstream\nendobj\n", "ascii")]),
  ];
  const header = Buffer.from("%PDF-1.4\n%METClub\n", "ascii");
  let offset = header.length;
  const offsets = [0];
  for (const object of objects) { offsets.push(offset); offset += object.length; }
  const xrefOffset = offset;
  const xref = Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((entry) => `${String(entry).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "ascii");
  return Buffer.concat([header, ...objects, xref]);
}

async function seedPdfResources() {
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const resource of sampleResources) {
    const filename = path.basename(resource.pdfUrl);
    await fs.writeFile(path.join(outputDirectory, filename), createPdf([resource.heading, resource.summary]));
  }
  const created = await prisma.pdfResource.createMany({
    data: sampleResources.map(({ heading: _heading, summary: _summary, ...resource }) => resource),
    skipDuplicates: true,
  });
  console.log(`Added ${created.count} sample PDF resources (one per category). Existing seed entries were left unchanged.`);
}

seedPdfResources()
  .catch((error) => { console.error("Could not seed PDF resources:", error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
