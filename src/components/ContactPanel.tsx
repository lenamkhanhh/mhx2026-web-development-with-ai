import { ArrowUpRight, DownloadSimple, EnvelopeSimple, GithubLogo } from "@phosphor-icons/react";
import { contact } from "../content";
import { ContactForm } from "./ContactForm";

export function ContactPanel() {
  return (
    <footer className="contact-panel" id="contact">
      <div className="section-label">
        <span>06</span>
        <p>Start a conversation</p>
      </div>
      <div className="contact-copy">
        <p className="contact-kicker">Open to internships and AI/CS lab opportunities</p>
        <h2>Looking for a student who learns rigorously and builds in public?</h2>
        <p>
          I would value the chance to contribute, learn from a strong technical team, and discuss difficult problems.
        </p>
      </div>
      <div className="contact-actions">
        <a className="button button-primary" href={contact.email.href}>
          <EnvelopeSimple aria-hidden="true" />
          Email me
          <ArrowUpRight aria-hidden="true" />
        </a>
        <a className="button" href={contact.cv.href} download>
          <DownloadSimple aria-hidden="true" />
          Download CV
        </a>
        <a className="text-link" href={contact.github.href} target="_blank" rel="noreferrer">
          <GithubLogo aria-hidden="true" />
          GitHub
        </a>
      </div>
      <ContactForm />
      <div className="contact-meta">
        <a href={contact.email.href}>{contact.email.value}</a>
        <a href={contact.codeforces.href} target="_blank" rel="noreferrer">
          Codeforces · {contact.codeforces.value}
        </a>
      </div>
    </footer>
  );
}
