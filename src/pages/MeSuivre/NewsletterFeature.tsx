import type { NewsletterFeature as NewsletterFeatureContent } from '../../mock/mesuivre';
import { NewsletterBlock } from '../../components/ui';

/**
 * The design-3c newsletter feature: the shared Salon dark card in its
 * two-column 'feature' layout, fed with the Me suivre mock content. All chrome,
 * layout and the inert-form contract live in <NewsletterBlock>.
 */
export default function NewsletterFeature({
  eyebrow,
  title,
  copy,
  placeholder,
  cta,
}: NewsletterFeatureContent) {
  return (
    <NewsletterBlock
      variant="feature"
      eyebrow={eyebrow}
      title={title}
      copy={copy}
      placeholder={placeholder}
      cta={cta}
      testId="newsletter-feature"
    />
  );
}
