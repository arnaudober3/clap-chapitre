import styles from './Layout.module.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <span className={styles.footerBrand}>
        Clap <span className={styles.brandEt}>et</span> chapitre
      </span>
      <span className={styles.footerMeta}>© {year} Marie-Zoé · Trouve ta prochaine histoire</span>
    </footer>
  );
}
