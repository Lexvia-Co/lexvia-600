import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-6 px-6 py-16 sm:py-24">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Prepare for an Australian visitor visa
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Applying from outside Australia? Use the Home Affairs guide to prepare
        for the subclass 600 Tourist stream. When you’re ready, lodge your
        application through ImmiAccount.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-overseas">
            Read the Tourist stream guide
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="https://online.immi.gov.au/lusc/login">Open ImmiAccount</a>
        </Button>
      </div>
    </main>
  );
}
