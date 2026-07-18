import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface ApiProject {
  id: string;
  title: string;
  description: string;
  image: string;
  technologies: string[];
  link: string;
}

export function ApiProjectGallery() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const endpoint = query.trim()
      ? `/api/projects?q=${encodeURIComponent(query.trim())}`
      : "/api/projects";

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json() as Promise<{ data: ApiProject[] }>;
      })
      .then(({ data }) => {
        if (active) setProjects(data);
      })
      .catch(() => {
        if (active) setError("The projects API is unavailable. Start the API server and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  return (
    <section className="api-project-section" aria-labelledby="api-projects-title">
      <div className="section-heading">
        <div className="section-label">
          <span>04B</span>
          <p>REST API integration</p>
        </div>
        <div>
          <h2 id="api-projects-title">Projects delivered by Node and Express.</h2>
          <p>
            This gallery fetches live data from the course API. Search terms are sent as REST query
            parameters rather than filtering hard-coded cards.
          </p>
        </div>
      </div>

      <label className="project-search api-project-search">
        <span>Search API projects</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setLoading(true);
            setError("");
            setQuery(event.target.value);
          }}
          placeholder="Try ReactJS, Express, FFT…"
        />
      </label>

      {loading && <p className="api-state" role="status">Loading projects…</p>}
      {error && <p className="api-state api-error" role="alert">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="api-state">No API projects match this search.</p>
      )}

      {!error && projects.length > 0 && (
        <div className="api-project-grid">
          {projects.map((project) => (
            <article className="api-project-card" key={project.id}>
              <img src={project.image} alt="" />
              <div>
                <div className="technology-list" aria-label="Technologies">
                  {project.technologies.map((technology) => (
                    <span key={technology}>{technology}</span>
                  ))}
                </div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <a href={project.link} target="_blank" rel="noreferrer">
                  View source <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
