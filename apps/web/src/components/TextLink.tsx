import type { AnchorHTMLAttributes } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  link: {
    color: tokens.colorBrandForegroundLink,
    // Let the OS pick link colours under forced colors (Windows high contrast).
    '@media (forced-colors: active)': { color: 'LinkText' },
  },
});

/** Plain anchor with a theme-aware colour (the browser default blue fails contrast in dark). */
export function TextLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const styles = useStyles();
  return <a {...props} className={styles.link} />;
}
