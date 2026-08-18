import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SocialBar from "../pages/Article/SocialBar";
import PrevNext from "../pages/Article/PrevNext";
import { anArticle } from "./fixtures";
import { useTestDb } from "./api-server";
import { SEED } from "./fixtures";

const root = resolve(__dirname, "../..");
const socialSource = readFileSync(
  resolve(root, "src/pages/Article/SocialBar.tsx"),
  "utf8",
);
const prevNextSource = readFileSync(
  resolve(root, "src/pages/Article/PrevNext.tsx"),
  "utf8",
);
const css = readFileSync(
  resolve(root, "src/pages/Article/Article.module.css"),
  "utf8",
);

const avis = anArticle();
const other = anArticle({
  id: "l-annee-de-la-pluie",
  title: "L'année de la pluie",
  medium: "livre",
});
const third = anArticle({
  id: "les-nuits-blanches",
  title: "Les nuits blanches",
  medium: "serie",
});

/** SocialBar holds the share menu, which reads the router location. */
function renderSocialBar() {
  return render(
    <MemoryRouter initialEntries={[`/article/${avis.id}`]}>
      <SocialBar article={avis} />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await useTestDb(SEED);
});

describe("ART-4 SocialBar", () => {
  it("renders the like pill and Partager button", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const before = window.location.href;
    renderSocialBar();

    const like = screen.getByRole("button", { name: /J'aime/ });
    expect(like).toHaveTextContent(String(avis.likes));
    expect(screen.getByRole("button", { name: "Partager" }).tagName).toBe(
      "BUTTON",
    );

    expect(like.tagName).toBe("BUTTON");
    expect(window.location.href).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("toggles the like pill on click and updates aria-pressed", async () => {
    renderSocialBar();
    const like = screen.getByRole("button", { name: /J'aime/ });

    expect(like).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(like);

    // After the API call resolves, the liked state should change to true.
    await waitFor(() => {
      expect(like).toHaveAttribute("aria-pressed", "true");
    });
    // The heart icon should be filled (♥ instead of ♡).
    expect(like.textContent).toContain("♥");

    fireEvent.click(like);

    // Clicking again should unlike it.
    await waitFor(() => {
      expect(like).toHaveAttribute("aria-pressed", "false");
    });
    // The heart icon should be empty again.
    expect(like.textContent).toContain("♡");
    expect(like.textContent).not.toContain("♥");
  });

  it("disables the like pill while the request is pending", async () => {
    renderSocialBar();
    const like = screen.getByRole("button", { name: /J'aime/ });

    expect(like).not.toHaveAttribute("disabled");
    fireEvent.click(like);

    expect(like).toHaveAttribute("disabled");

    await waitFor(() => {
      expect(like).not.toHaveAttribute("disabled");
    });
  });
});

describe("ART-4 PrevNext", () => {
  it("renders both neighbour cards with their labels and links", () => {
    render(
      <MemoryRouter>
        <PrevNext prev={other} next={third} />
      </MemoryRouter>,
    );

    const prev = screen.getByTestId("prev-card");
    expect(prev).toHaveAttribute("href", `/article/${other.id}`);
    expect(prev).toHaveTextContent("Avis précédent");
    expect(prev).toHaveTextContent(other.title);

    const next = screen.getByTestId("next-card");
    expect(next).toHaveAttribute("href", `/article/${third.id}`);
    expect(next).toHaveTextContent("Avis suivant");
    expect(next).toHaveTextContent(third.title);
  });

  it("omits the missing side entirely and never links to undefined", () => {
    const { container, unmount } = render(
      <MemoryRouter>
        <PrevNext next={third} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", `/article/${third.id}`);
    expect(screen.queryByTestId("prev-card")).toBeNull();
    expect(screen.queryByText(/Avis précédent/)).toBeNull();
    expect(container.innerHTML).not.toContain("undefined");
    unmount();

    const { container: empty } = render(
      <MemoryRouter>
        <PrevNext />
      </MemoryRouter>,
    );
    expect(empty).toBeEmptyDOMElement();
  });
});

/* jsdom applies no media queries, so the responsive rules are asserted on the
   CSS text: everything before the lg block is the mobile (4b) layer. */
const LG = "@media (min-width: 1024px)";
const mobileCss = css.slice(0, css.indexOf(LG));
const desktopCss = css.slice(css.indexOf(LG));

/** The declarations of the last `.name` rule in `source`, or '' if absent. */
function ruleOf(source: string, name: string): string {
  const matches = [
    ...source.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, "g")),
  ];
  return matches.length ? matches[matches.length - 1][1] : "";
}

describe("ART-4 responsive rules", () => {
  it("keeps prev/next desktop-only", () => {
    expect(css).toContain(LG);
    expect(ruleOf(mobileCss, "prevNext")).toMatch(/display:\s*none/);
    expect(ruleOf(desktopCss, "prevNext")).toMatch(
      /display:\s*(inline|grid|flex)/,
    );
  });

  it('shows "J\'aime ·" only on desktop', () => {
    expect(ruleOf(mobileCss, "likeWord")).toMatch(/display:\s*none/);
    expect(ruleOf(desktopCss, "likeWord")).toMatch(/display:\s*inline/);
  });
});

describe("ART-4 accessible names", () => {
  it("names the like button independently of the hidden text", () => {
    renderSocialBar();
    // The visible "J'aime ·" is dropped on mobile — the label carries it.
    expect(
      screen.getByRole("button", { name: `J'aime · ${avis.likes}` }),
    ).toBeInTheDocument();
  });
});

describe("ART-4 tokens", () => {
  it("uses no raw Salon hex colour literal", () => {
    expect(socialSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(prevNextSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
