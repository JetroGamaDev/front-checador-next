import NotFound from "@/app/not-found";
import NewsletterListView from "./NewsletterListView";
import NewsletterFormView from "./NewsletterFormView";
import { INewsletter, INoticeChecador } from "@/lib/definitions";
import {
  fetchNewsletters,
  fetchNoticeChecadores,
  findNewslettersById,
} from "@/app/actions/newsletter-actions";

async function NewsletterMainView({
  viewType,
  id,
}: {
  viewType: string;
  id: string;
}) {
  let newsletter: INewsletter | null = null;
  let newsletters: INewsletter[] = [];

  if (id && id !== "null") {
    newsletter = await findNewslettersById({ id });
  }

  [newsletters] = await Promise.all([fetchNewsletters()]);

  if (viewType === "list") {
    return <NewsletterListView newsletters={newsletters} />;
  } else if (viewType === "form") {
    const checadoresRes = await fetchNoticeChecadores();
    const checadores: INoticeChecador[] = checadoresRes.data ?? [];
    return <NewsletterFormView id={id} newsletter={newsletter} checadores={checadores} />;
  } else {
    return <NotFound />;
  }
}

export default NewsletterMainView;
