import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>
          SmartCartify turns your cart into a sales booster
        </h1>
        <p className={styles.text}>
          Create a fast, flexible cart drawer with progress milestones, auto
          discounts, and free gifts that lift AOV without extra apps.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Cart milestones.</strong> Motivate shoppers with progress
            bars, free shipping goals, and reward messaging.
          </li>
          <li>
            <strong>Smart promotions.</strong> Run auto discounts, free gift
            rules, and buy X get Y offers directly in the cart drawer.
          </li>
          <li>
            <strong>Full design control.</strong> Match your brand with color,
            typography, and layout controls from the editor.
          </li>
        </ul>
      </div>
    </div>
  );
}
