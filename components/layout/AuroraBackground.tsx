/** The same three-hue wash used on the homepage hero, factored out so every
 * surface — auth, dashboard, public browse/profile — shares one recipe
 * instead of each page re-inventing its own gradient. `intensity="hero"` is
 * the full-strength homepage treatment; `"subtle"` is a fainter version for
 * pages where content (forms, listings) needs to stay the visual focus. */
export function AuroraBackground({ intensity = "subtle" }: { intensity?: "hero" | "subtle" }) {
  const opacity = intensity === "hero" ? "opacity-[0.16]" : "opacity-[0.07]";
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 ${opacity}`}
      style={{
        background:
          "radial-gradient(38rem 24rem at 18% 15%, #6D28D9, transparent 60%)," +
          "radial-gradient(34rem 22rem at 85% 20%, #0369A1, transparent 60%)," +
          "radial-gradient(40rem 26rem at 50% 95%, #B45309, transparent 60%)",
      }}
    />
  );
}
