import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  CircleUserRound,
  Leaf,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImg from "@/assets/images/enkana-hero.png";
import beefImg from "@/assets/images/category-beef.png";
import goatImg from "@/assets/images/category-goat.png";
import muttonImg from "@/assets/images/category-mutton.png";
import chickenImg from "@/assets/images/category-chicken.png";
import blogFarmImg from "@/assets/images/blog-farm-to-table.png";
import blogBeefImg from "@/assets/images/blog-grass-fed.png";
import blogFamilyImg from "@/assets/images/blog-family-meals.png";
import blogChickenImg from "@/assets/images/blog-kienyeji.png";

type ProductCategory = {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  image: string;
};

const categories: ProductCategory[] = [
  {
    id: "beef",
    name: "Beef",
    tagline: "Grass-fed, clean cuts",
    badge: "Grass-fed",
    image: beefImg,
  },
  {
    id: "goat",
    name: "Goat",
    tagline: "Tender, flavorful",
    badge: "Fresh",
    image: goatImg,
  },
  {
    id: "mutton",
    name: "Mutton",
    tagline: "Rich, hearty",
    badge: "Farm-sourced",
    image: muttonImg,
  },
  {
    id: "chicken",
    name: "Kienyeji Chicken",
    tagline: "Free-range (kienyeji)",
    badge: "Kienyeji",
    image: chickenImg,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function Pill({ label }: { label: string }) {
  return (
    <div
      className="enkana-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-foreground/80 shadow-sm"
      data-testid={`pill-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" strokeWidth={2.2} />
      <span>{label}</span>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div
        className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur"
        data-testid={`text-eyebrow-${eyebrow.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Leaf className="h-3.5 w-3.5 text-[hsl(var(--primary))]" strokeWidth={2.2} />
        <span>{eyebrow}</span>
      </div>
      <h2
        className="mt-4 font-display text-3xl tracking-tight text-foreground md:text-4xl"
        data-testid={`text-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className="mt-3 text-balance text-sm leading-relaxed text-foreground/70 md:text-base"
          data-testid={`text-description-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen enkana-bg">
      <header className="sticky top-0 z-40 bg-background backdrop-blur" style={{borderBottom: '2px solid transparent', borderImage: 'linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.4), hsl(var(--primary) / 0.3)) 1'}}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <a
            href="/"
            className="group inline-flex items-center gap-3"
            data-testid="link-home"
          >
            <img
              src="/logo.png"
              alt="Enkana Fresh"
              className="h-11 w-11 rounded-full object-contain mix-blend-multiply"
              data-testid="img-logo"
            />
            <div className="leading-tight">
              <div
                className="font-display text-lg tracking-tight"
                data-testid="text-brand"
              >
                Enkana Fresh
              </div>
              <div
                className="text-xs font-semibold text-foreground/60"
                data-testid="text-tagline"
              >
                Farm to family, done right
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-foreground/70 md:flex">
            <a href="#why" className="hover:text-foreground" data-testid="link-why">
              Why
            </a>
            <a
              href="#how"
              className="hover:text-foreground"
              data-testid="link-how"
            >
              How it works
            </a>
            <a
              href="#coming-soon"
              className="hover:text-foreground"
              data-testid="link-coming-soon"
            >
              Coming soon
            </a>
            <a
              href="#blog"
              className="hover:text-foreground"
              data-testid="link-blog"
            >
              Blog
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              className="enkana-btn-glow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]"
              data-testid="button-order-whatsapp-top"
              onClick={() => {
                window.open("https://wa.me/254783100001", "_blank", "noopener,noreferrer");
              }}
            >
              <Phone className="mr-2 h-4 w-4" />
              Order via WhatsApp
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
            {import.meta.env.DEV && (
              <a
                href="/dashboard"
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-foreground/20 text-foreground/40 hover:border-foreground/40 hover:text-foreground/60 transition"
                data-testid="link-admin-login"
                title="Admin Dashboard"
              >
                <CircleUserRound className="h-5 w-5" strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImg}
              alt="Farm landscape"
              className="h-full w-full object-cover"
              data-testid="img-hero"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background" />
            <div className="absolute inset-0 enkana-hero-overlay" />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-12 md:gap-8 md:px-6 md:py-20">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              variants={fadeUp}
              className="md:col-span-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill label="Fresh, not frozen" />
                <Pill label="Hygienically processed" />
                <Pill label="Order via WhatsApp" />
              </div>

              <h1
                className="mt-6 text-balance font-display text-4xl leading-[1.04] tracking-tight md:text-6xl"
                data-testid="text-hero-title"
              >
                Fresh meat, from{" "}
                <span className="enkana-gradient-text">farm to family.</span>
              </h1>

              <p
                className="mt-4 max-w-xl text-balance text-base leading-relaxed text-foreground/75 md:text-lg"
                data-testid="text-hero-subtitle"
              >
                Monthly household meat orders—freshly prepared and delivered, without the trip to the butcher.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="enkana-btn-glow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]"
                  data-testid="button-order-whatsapp-hero"
                  onClick={() => {
                    window.open("https://wa.me/254783100001", "_blank", "noopener,noreferrer");
                  }}
                >
                  Order via WhatsApp
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.06 }}
              className="md:col-span-5"
            >
              <Card className="glass grain-overlay ring-soft overflow-hidden">
                <div className="p-5 md:p-6">
                  <div
                    className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))]/20 px-3 py-1 text-xs font-semibold text-foreground/80"
                    data-testid="status-availability"
                  >
                    <Truck className="h-4 w-4" />
                    Delivering fresh, chilled
                  </div>

                  <h3
                    className="mt-4 font-display text-2xl tracking-tight"
                    data-testid="text-card-title"
                  >
                    Monthly order, simplified
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed text-foreground/70"
                    data-testid="text-card-subtitle"
                  >
                    Tap a category, then send us your usual cuts and quantity. We’ll confirm pricing and schedule delivery.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        className="group relative overflow-hidden rounded-xl border border-[hsl(var(--primary))]/10 bg-white/60 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/80 hover:border-[hsl(var(--primary))]/25 hover:shadow-md active:translate-y-0"
                        data-testid={`button-category-${c.id}`}
                        onClick={() => {
                          window.open("https://wa.me/254783100001", "_blank", "noopener,noreferrer");
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-foreground/70">
                              {c.badge}
                            </div>
                            <div className="mt-1 font-display text-base leading-tight">
                              {c.name}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-foreground/45 transition group-hover:translate-x-0.5 group-hover:text-foreground/70" />
                        </div>
                        <div className="mt-2 text-xs text-foreground/65">
                          {c.tagline}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div
                    className="mt-5 flex items-start gap-3 rounded-xl border bg-white/55 p-4"
                    data-testid="card-trust"
                  >
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 text-[hsl(var(--primary))]"
                      strokeWidth={2.2}
                    />
                    <div>
                      <div
                        className="text-sm font-semibold"
                        data-testid="text-trust-title"
                      >
                        Built on trust
                      </div>
                      <div
                        className="mt-1 text-sm text-foreground/70"
                        data-testid="text-trust-body"
                      >
                        Trusted farmers, licensed abattoirs, hygienic handling, and clear
                        pricing.
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        <div className="enkana-divider" />

        <section className="enkana-section-green mx-auto max-w-6xl px-4 py-14 md:px-6" id="why">
          <SectionTitle
            eyebrow="Why Enkana Fresh"
            title="Quality you can feel. Convenience you’ll keep."
            description="We bring premium, responsibly sourced meat to modern households—fresh, hygienic, and reliably delivered." 
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "trust",
                icon: ShieldCheck,
                title: "Trusted & transparent",
                text: "Trusted farmers, licensed abattoirs, hygienic handling, and clear pricing—so you can order with confidence.",
              },
              {
                id: "fresh",
                icon: Sparkles,
                title: "Fresh, not frozen",
                text: "We process on demand and deliver fresh with minimal storage and maximum care.",
              },
              {
                id: "local",
                icon: MapPin,
                title: "From nearby farms",
                text: "Local sourcing keeps the chain short and quality high—farm to table, without the stress.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.id}
                  className="enkana-card-hover grain-overlay ring-soft glass enkana-card p-6"
                  style={{
                    ["--enkana-card-accent" as any]:
                      f.id === "trust"
                        ? "156 44% 22%"
                        : f.id === "fresh"
                          ? "44 70% 52%"
                          : "210 55% 55%",
                    ["--enkana-card-accent-2" as any]:
                      f.id === "trust"
                        ? "44 70% 52%"
                        : f.id === "fresh"
                          ? "156 44% 22%"
                          : "26 46% 48%",
                  }}
                  data-testid={`card-feature-${f.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="enkana-icon-box grid h-11 w-11 place-items-center rounded-xl text-[hsl(var(--primary))]">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                      <div
                        className="font-display text-lg tracking-tight"
                        data-testid={`text-feature-title-${f.id}`}
                      >
                        {f.title}
                      </div>
                      <div
                        className="mt-1 text-sm leading-relaxed text-foreground/70"
                        data-testid={`text-feature-body-${f.id}`}
                      >
                        {f.text}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <div className="enkana-divider" />

        <section className="border-y enkana-section-gold" id="how">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
            <SectionTitle
              eyebrow="How it works"
              title="From order to doorstep—simple."
              description="Tell us what you want, how you want it cut, and when you want it delivered. We handle the rest." 
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  id: "place",
                  step: "1",
                  title: "Place your order",
                  text: "Order beef, goat, mutton, or kienyeji chicken via WhatsApp.",
                },
                {
                  id: "prepare",
                  step: "2",
                  title: "Prepared fresh",
                  text: "Processed to spec—chopped, portioned and packed, with care.",
                },
                {
                  id: "deliver",
                  step: "3",
                  title: "Delivered to you",
                  text: "Fresh, chilled delivery at your preferred time.",
                },
              ].map((s) => (
                <Card
                  key={s.id}
                  className="enkana-card-hover grain-overlay ring-soft glass enkana-card p-6"
                  style={{
                    ["--enkana-card-accent" as any]:
                      s.id === "place"
                        ? "44 70% 52%"
                        : s.id === "prepare"
                          ? "156 44% 22%"
                          : "210 55% 55%",
                    ["--enkana-card-accent-2" as any]:
                      s.id === "place"
                        ? "156 44% 22%"
                        : s.id === "prepare"
                          ? "26 46% 48%"
                          : "44 70% 52%",
                  }}
                  data-testid={`card-step-${s.id}`}
                >
                  <div
                    className="enkana-step-number inline-flex h-9 w-9 items-center justify-center rounded-full text-sm"
                    data-testid={`text-step-number-${s.id}`}
                  >
                    {s.step}
                  </div>
                  <div
                    className="mt-4 font-display text-lg tracking-tight"
                    data-testid={`text-step-title-${s.id}`}
                  >
                    {s.title}
                  </div>
                  <div
                    className="mt-1 text-sm leading-relaxed text-foreground/70"
                    data-testid={`text-step-body-${s.id}`}
                  >
                    {s.text}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>


        <div className="enkana-divider" />

        <section className="border-y bg-card/40" id="coming-soon">
          <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border bg-card/60 p-6 backdrop-blur sm:p-8">
              <div
                className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-foreground/70"
                data-testid="text-coming-eyebrow"
              >
                <Sparkles className="h-4 w-4 text-[hsl(var(--accent))]" />
                <span>Coming soon</span>
              </div>
              <div
                className="mt-4 font-display text-2xl tracking-tight md:text-3xl"
                data-testid="text-coming-title"
              >
                Milk, vegetables, and everyday essentials.
              </div>
              <div
                className="mt-2 text-sm leading-relaxed text-foreground/70 md:text-base"
                data-testid="text-coming-body"
              >
                We’re starting with meat because it matters—and building towards a full farm-to-family fresh food experience.
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  className="enkana-btn-glow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]"
                  data-testid="button-coming-whatsapp"
                  onClick={() => {
                    window.open("https://wa.me/254783100001", "_blank", "noopener,noreferrer");
                  }}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Order via WhatsApp
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
                <div className="text-sm text-foreground/70" data-testid="text-coming-note">
                  Save our number for monthly orders.
                </div>
              </div>
            </div>
          </div>
        </section>


        <div className="enkana-divider" />

        <section className="enkana-section-green py-14" id="blog">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionTitle
              eyebrow="From our kitchen"
              title="Stories, tips & insights"
              description="Sumptuous stories on fresh food, conscious eating, and building a farm-to-family food culture in Kenya."
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  id: "farm-to-table",
                  image: blogFarmImg,
                  tag: "Farm Life",
                  title: "Why farm-to-table matters more than ever in Nairobi",
                  excerpt: "How shorter supply chains mean fresher meat, fairer prices for farmers, and healthier meals for your family.",
                  url: "https://blog.enkanafresh.com/farm-to-table-nairobi/",
                },
                {
                  id: "grass-fed",
                  image: blogBeefImg,
                  tag: "Nutrition",
                  title: "Grass-fed vs. feedlot beef: what's really on your plate?",
                  excerpt: "The science behind grass-fed meat—higher omega-3s, better taste, and why it's worth the switch.",
                  url: "https://blog.enkanafresh.com/grass-fed-vs-feedlot/",
                },
                {
                  id: "family-meals",
                  image: blogFamilyImg,
                  tag: "Lifestyle",
                  title: "Planning monthly meals: a busy family's guide",
                  excerpt: "Simple strategies to stock your kitchen, reduce waste, and eat well every day without the last-minute rush.",
                  url: "https://blog.enkanafresh.com/monthly-meal-planning/",
                },
                {
                  id: "kienyeji",
                  image: blogChickenImg,
                  tag: "Heritage",
                  title: "The kienyeji chicken comeback: flavour meets tradition",
                  excerpt: "Why free-range kienyeji chicken is making a return to modern Kenyan kitchens—and how we source ours.",
                  url: "https://blog.enkanafresh.com/kienyeji-chicken/",
                },
              ].map((post) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="enkana-card-hover group flex flex-col overflow-hidden rounded-xl border bg-card/80 backdrop-blur transition"
                  data-testid={`card-blog-${post.id}`}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="enkana-pill rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-foreground/80">
                        {post.tag}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3
                      className="font-display text-base leading-snug tracking-tight group-hover:text-[hsl(var(--primary))] transition-colors"
                      data-testid={`text-blog-title-${post.id}`}
                    >
                      {post.title}
                    </h3>
                    <p
                      className="mt-2 flex-1 text-xs leading-relaxed text-foreground/60"
                      data-testid={`text-blog-excerpt-${post.id}`}
                    >
                      {post.excerpt}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))]">
                      Read more
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t enkana-footer">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Enkana Fresh"
                className="h-11 w-11 rounded-full object-contain mix-blend-multiply"
              />
              <div>
                <div
                  className="font-display text-lg tracking-tight"
                  data-testid="text-footer-brand"
                >
                  Enkana Fresh
                </div>
                <div
                  className="mt-1 text-sm text-foreground/70"
                  data-testid="text-footer-note"
                >
                  Organic, grass-fed meat delivered fresh—from farm to table.
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 md:items-end">
              <Button
                className="enkana-btn-glow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]"
                data-testid="button-footer-whatsapp"
                onClick={() => {
                  window.open("https://wa.me/254783100001", "_blank", "noopener,noreferrer");
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                Order via WhatsApp
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.tiktok.com/@enkanafresh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15 text-foreground/50 transition hover:border-[hsl(var(--primary))]/30 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5"
                  data-testid="link-tiktok"
                  title="TikTok"
                  aria-label="Follow us on TikTok"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.76 1.5V6.8a4.83 4.83 0 0 1-1-.11z"/></svg>
                </a>
                <a
                  href="https://www.instagram.com/enkanafresh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15 text-foreground/50 transition hover:border-[hsl(var(--primary))]/30 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5"
                  data-testid="link-instagram"
                  title="Instagram"
                  aria-label="Follow us on Instagram"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a
                  href="https://www.youtube.com/@enkanafresh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15 text-foreground/50 transition hover:border-[hsl(var(--primary))]/30 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5"
                  data-testid="link-youtube"
                  title="YouTube"
                  aria-label="Subscribe on YouTube"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a
                  href="https://x.com/enkanafresh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15 text-foreground/50 transition hover:border-[hsl(var(--primary))]/30 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5"
                  data-testid="link-x"
                  title="X"
                  aria-label="Follow us on X"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
