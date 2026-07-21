import { NewsletterBlock } from '../../components/ui';

/**
 * The dark "On se suit ?" follow CTA card: the shared Salon dark card in its
 * 'compact' layout, whose action is a react-router <Link> (client-side
 * navigation — not a bare <a href>, not a dead '#').
 */
export default function FollowCard({
  title,
  copy,
  cta,
  to,
}: {
  title: string;
  copy: string;
  cta: string;
  to: string;
}) {
  return (
    <NewsletterBlock
      variant="compact"
      title={title}
      copy={copy}
      cta={cta}
      to={to}
      testId="follow-card"
    />
  );
}
