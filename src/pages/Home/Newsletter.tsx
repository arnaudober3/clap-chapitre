import { NewsletterBlock } from '../../components/ui';

/**
 * Home's "Le courrier du mois" newsletter band: the shared Salon dark card in
 * its centred 'band' layout. The form is inert — see <NewsletterBlock>.
 */
export default function Newsletter() {
  return (
    <NewsletterBlock
      variant="band"
      title="Le courrier du mois"
      copy="Une lettre par mois : les avis marquants, les découvertes et les histoires à ne pas manquer."
      placeholder="votre@email.fr"
      cta="S’abonner"
    />
  );
}
