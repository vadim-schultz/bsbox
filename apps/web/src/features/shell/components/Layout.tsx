import type { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { LocaleSwitcher } from '../../../components';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  bar: { display: 'flex', justifyContent: 'flex-end' },
});

export function Layout({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <LocaleSwitcher />
      </div>
      <main>{children}</main>
    </div>
  );
}
