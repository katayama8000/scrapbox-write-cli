import 'dotenv/config'
import { launch, type Page, type Browser } from "puppeteer";

type TextFormat = "link" | "strong" | "italic" | "strike" | "plain";

type TextItem = {
    content: string;
    format: TextFormat;
}

const formatTextItems = (items: TextItem[]): string => {
    return items.map(({ content, format }) => {
        switch (format) {
            case "link":
                return `#${content}`;
            case "strong":
                return `[* ${content}]`;
            case "italic":
                return `[/ ${content}]`;
            case "strike":
                return `[  ${content}]`;
            case "plain":
                return content;
            default: {
                const exhaustiveCheck: never = format;
                throw new Error(`Unsupported format: ${exhaustiveCheck}`);
            }
        }
    }).join('\n');
};

const TEMPLATES = {
    daily: {
        text: formatTextItems([
            { content: "ルーティン", format: "strong" },
            { content: "外に出る", format: "plain" },
            { content: "水を飲む", format: "plain" },
            { content: "シャワーを浴びる", format: "plain" },
            { content: "起床時間", format: "strong" },
            { content: "感想", format: "strong" },
            { content: "明日すること", format: "strong" },
            { content: "日記", format: "strong" },
            { content: "#daily", format: "link" }
        ]),
        getTitleFn: (date: Date) => formatDate(date, 'yyyy/M/d (ddd)')
    },
    weekly: {
        text: formatTextItems([
            { content: "目標", format: "strong" },
            { content: "新しいこと", format: "strong" },
            { content: "振り返り", format: "strong" },
            { content: "感想", format: "strong" },
            { content: "日記", format: "strong" },
            { content: "#weekly", format: "link" }
        ]),
        getTitleFn: (date: Date) => {
            const endDate = new Date(date);
            endDate.setDate(date.getDate() + 6);
            return `${formatDate(date, 'yyyy/M/d')} ~ ${formatDate(endDate, 'yyyy/M/d')}`;
        }
    }
};

const formatDate = (date: Date, format: string): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return format
        .replace('yyyy', date.getFullYear().toString())
        .replace('M', (date.getMonth() + 1).toString())
        .replace('d', date.getDate().toString())
        .replace('ddd', days[date.getDay()]);
};

const checkPageExists = async (project: string, title: string): Promise<boolean> => {
    const res = await fetch(`https://scrapbox.io/api/pages/${project}/${encodeURIComponent(title)}`);
    return res.ok;
};


const initializeBrowser = async (sid: string): Promise<{ browser: Browser; page: Page }> => {
    const browser = await launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setCookie({ name: 'connect.sid', value: sid, domain: 'scrapbox.io' });
    return { browser, page };
};

const writeToScrapbox = async (sid: string, project: string, title: string, text: string): Promise<void> => {
    const url = new URL(`https://scrapbox.io/${project}/${encodeURIComponent(title)}?body=${encodeURIComponent(text)}`);
    const { browser, page } = await initializeBrowser(sid);

    if (await checkPageExists(project, title)) {
        console.log(`Page already exists: ${title}`);
        throw new Error("Page already exists");
    }
    await page.goto(url.toString());
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    await browser.close();
    console.log('Successfully written to Scrapbox:', title);
};

const main = async () => {
    const templateType = process.argv[2] as keyof typeof TEMPLATES;
    if (!templateType || !TEMPLATES[templateType]) {
        console.error("Usage: yarn <daily|weekly>");
        process.exit(1);
    }

    const template = TEMPLATES[templateType];
    const today = new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60 * 1000);
    const title = template.getTitleFn(today);

    const sid = process.env.SCRAPBOX_SID;
    if (!sid) {
        console.error("Please set the SCRAPBOX_SID environment variable.");
        process.exit(1);
    }

    console.log(`Writing to Scrapbox: ${title}...`);

    try {
        await writeToScrapbox(sid, 'katayama8000', title, template.text);
    } catch (error) {
        console.error("Failed to write to Scrapbox:", error);
    }
};

main().catch(console.error);