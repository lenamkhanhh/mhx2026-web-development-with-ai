import {
  preUniversityAchievements,
  preUniversityArchivePeriod,
} from "../content";

export function PreUniversityRecord() {
  const [grade10, grade11, grade12, regionalFirst, nationalFinal, aprilOlympiad] = preUniversityAchievements;

  return (
    <section className="foundation-section foundation-archive-section" aria-labelledby="foundation-title">
      <div className="foundation-main">
        <div className="foundation-heading">
          <div>
            <p className="foundation-indexline">02 / PRE-UNIVERSITY RECORD · {preUniversityArchivePeriod}</p>
            <p className="foundation-kicker">Informatics competition record</p>
            <h2 id="foundation-title">A record built before university.</h2>
          </div>
          <p>
            The competition record that shaped the algorithmic discipline behind my current work
            at HCMUS.
          </p>
        </div>

        <div className="foundation-archive">
          <div className="foundation-spread">
            <div className="foundation-record-ledger">
              <article className="foundation-progression">
                <div className="foundation-card-topline">
                  <span>01 / PROGRESSION</span>
                  <span>{preUniversityArchivePeriod}</span>
                </div>
                <p className="foundation-card-kicker">Provincial selection examination</p>
                <h3>Three years of steady progression.</h3>
                <ol className="foundation-years">
                  {[grade10, grade11, grade12].map((achievement) => (
                    <li key={achievement.context}>
                      <span>{achievement.context.replace("Informatics · ", "")}</span>
                      <strong>{achievement.award}</strong>
                      <small>Informatics</small>
                    </li>
                  ))}
                </ol>
              </article>

              <article className="foundation-feature">
                <div className="foundation-card-topline">
                  <span>02 / NATIONAL YOUTH INFORMATICS</span>
                  <span>2024</span>
                </div>
                <p className="foundation-card-kicker">The 30th National Young Informatics Contest</p>
                <p className="foundation-feature-award">{regionalFirst.award}</p>
                <h3>Central Region · Table C2</h3>
                <p className="foundation-feature-summary">
                  Advanced to the national finals as Ninh Thuận’s sole representative in the C2 division.
                </p>
                {regionalFirst.href ? (
                  <a className="foundation-source" href={regionalFirst.href} target="_blank" rel="noreferrer">
                    Read official announcement <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </article>
            </div>

            <figure className="foundation-bridge-figure">
              <div className="foundation-bridge-frame">
                <img
                  src="/assets/achievement/competition-stage-enhanced.webp"
                  alt="Le Nam Khanh solving a problem on stage at HCMUS Coding Challenge 2026"
                  width="1920"
                  height="1440"
                  decoding="async"
                />
                <span>CONTINUATION / 2026</span>
              </div>
              <figcaption>
                <span>HCMUS Coding Challenge · 2026</span>
                <p>On-stage problem solving — the next chapter after the pre-university record.</p>
              </figcaption>
            </figure>
          </div>

          <div className="foundation-proof-strip" aria-label="Additional verified distinctions">
            <article>
              <span>03 / NATIONAL FINALS · 2024</span>
              <p>The 30th National Young Informatics Contest</p>
              <strong>{nationalFinal.award}</strong>
            </article>
            <article>
              <span>04 / OLYMPIAD · 2024</span>
              <p>The 28th Traditional April 30 Olympiad · Informatics</p>
              <strong>{aprilOlympiad.award}</strong>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
