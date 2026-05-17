import { HomeHeader } from "./components/HomeHeader";
import { ListingsFeed } from "./components/ListingsFeed";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <HomeHeader />

      <main>
        <section className={styles.contentGrid} id="listings">
          <ListingsFeed />
        </section>
      </main>
    </div>
  );
}
