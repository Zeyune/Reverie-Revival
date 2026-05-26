import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type RegionEntry = {
  region_code: string;
  region_name: string;
};

type ProvinceEntry = {
  province_code: string;
  province_name: string;
  region_code: string;
};

type CityEntry = {
  city_code: string;
  city_name: string;
  province_code: string;
};

type BarangayEntry = {
  brgy_code: string;
  brgy_name: string;
  city_code: string;
};

type LocationOption = {
  code: string;
  name: string;
};

type LocationCache = {
  regions: RegionEntry[];
  provinces: ProvinceEntry[];
  cities: CityEntry[];
  barangays: BarangayEntry[];
};

const DATA_DIR = path.join(
  process.cwd(),
  "src",
  "data",
  "philippine-addresses",
  "ph-json"
);

const cache: Partial<LocationCache> = {};

const sortByName = (a: LocationOption, b: LocationOption) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

async function loadJson<K extends keyof LocationCache>(
  key: K,
  filename: string
): Promise<LocationCache[K]> {
  const cached = cache[key];
  if (cached) {
    return cached;
  }

  const filePath = path.join(DATA_DIR, filename);
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as LocationCache[K];
  cache[key] = parsed;
  return parsed;
}

async function getRegions() {
  const regions = await loadJson("regions", "region.json");
  return regions
    .map((region) => ({
      code: region.region_code,
      name: region.region_name,
    }))
    .sort(sortByName);
}

async function getProvinces(regionCode: string) {
  const provinces = await loadJson("provinces", "province.json");
  return provinces
    .filter((province) => province.region_code === regionCode)
    .map((province) => ({
      code: province.province_code,
      name: province.province_name,
    }))
    .sort(sortByName);
}

async function getCities(provinceCode: string) {
  const cities = await loadJson("cities", "city.json");
  return cities
    .filter((city) => city.province_code === provinceCode)
    .map((city) => ({
      code: city.city_code,
      name: city.city_name,
    }))
    .sort(sortByName);
}

async function getBarangays(cityCode: string) {
  const barangays = await loadJson("barangays", "barangay.json");
  return barangays
    .filter((barangay) => barangay.city_code === cityCode)
    .map((barangay) => ({
      code: barangay.brgy_code,
      name: barangay.brgy_name,
    }))
    .sort(sortByName);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const code = searchParams.get("code") ?? "";

  try {
    if (level === "regions") {
      return NextResponse.json({ options: await getRegions() });
    }

    if (level === "provinces") {
      if (!code) {
        return NextResponse.json(
          { error: "Missing region code." },
          { status: 400 }
        );
      }
      return NextResponse.json({ options: await getProvinces(code) });
    }

    if (level === "cities") {
      if (!code) {
        return NextResponse.json(
          { error: "Missing province code." },
          { status: 400 }
        );
      }
      return NextResponse.json({ options: await getCities(code) });
    }

    if (level === "barangays") {
      if (!code) {
        return NextResponse.json(
          { error: "Missing city code." },
          { status: 400 }
        );
      }
      return NextResponse.json({ options: await getBarangays(code) });
    }

    return NextResponse.json(
      { error: "Invalid location request." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to load location data.", error);
    return NextResponse.json(
      { error: "Unable to load location data." },
      { status: 500 }
    );
  }
}
