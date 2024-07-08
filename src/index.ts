require('dotenv').config()
import puppeteer, { type Page } from "puppeteer";

const DAILY_TEXT = "[* ルーティン]\n[* 感想]\n#daily";
const WEEKLY_TEXT = "[* 目標]\n[* 振り返り]\n[* 感想]\n[* 日記]\n#weekly";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const checkPageExists = async (page: Page, project: string, title: string) => {
    await page.goto(
        `https://scrapbox.io/api/pages/${project}/${encodeURIComponent(title)}/text`,
    );
    const content = await page.evaluate(() => document.body.innerText);
    return content !== '{"name":"NotFoundError","message":"Page not found."}';
};

const createScrapboxPage = async (page: Page, url: string) => {
    await page.goto(url);
    await sleep(1000);
};

const writeToScrapbox = async (
    sid: string,
    project: string,
    title: string,
    text: string,
) => {
    try {
        const url = new URL(
            `https://scrapbox.io/${project}/${encodeURIComponent(title)}?body=${encodeURIComponent(text)}`,
        );
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();

        await page.setCookie({
            name: "connect.sid",
            value: sid,
            domain: "scrapbox.io",
        });

        const pageExists = await checkPageExists(page, project, title);
        if (pageExists) {
            console.error(`Page "${title}" already exists.`);
            await browser.close();
            process.exit(1);
        }

        await createScrapboxPage(page, url.toString());
        await browser.close();
    } catch (error) {
        console.error("Failed to write to Scrapbox:", error);
    }
};

const generateTitles = () => {
    const today = new Date(
        Date.now() + (new Date().getTimezoneOffset() + 540) * 60 * 1000,
    );
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][today.getDay()];

    const dailyTitle = `${year}/${month}/${date} (${day})`;
    const weeklyTitle = `${year}/${month}/${date} ~ ${year}/${month}/${date + 6}`;

    return { dailyTitle, weeklyTitle };
};

const main = async () => {
    if (process.argv.length !== 3) {
        console.error("Usage: yarn <daily|weekly>");
        process.exit(1);
    }

    const template = process.argv[2];
    const { dailyTitle, weeklyTitle } = generateTitles();
    const title = template === "daily" ? dailyTitle : weeklyTitle;
    const text = template === "daily" ? DAILY_TEXT : WEEKLY_TEXT;

    const sid = process.env.SCRAPBOX_SID;
    if (!sid) {
        console.error("Please set the SCRAPBOX_SID environment variable.");
        process.exit(1);
    }

    console.log(`Writing to Scrapbox: ${title}...`);

    await writeToScrapbox(
        sid,
        "katayama8000",
        title,
        text,
    );

    console.log("Done!");
};

main().catch(console.error);
