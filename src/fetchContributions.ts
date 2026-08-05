import fetch from "node-fetch";

export interface ContributionDay {
  date: string;
  contributionCount: number;
  /** GitHub's own bucket, "NONE" | "FIRST_QUARTILE" | ... "FOURTH_QUARTILE" */
  contributionLevel: string;
  weekday: number; // 0 = Sunday
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
            weekday
          }
        }
      }
    }
  }
}
`;

interface GraphQLResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: {
            contributionDays: {
              date: string;
              contributionCount: number;
              contributionLevel: string;
              weekday: number;
            }[];
          }[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

export async function fetchContributions(
  login: string,
  token: string
): Promise<ContributionCalendar> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-bomberman-generator",
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });

  if (!res.ok) {
    throw new Error(
      `GitHub GraphQL request failed: ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as GraphQLResponse;

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GitHub GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`
    );
  }

  const calendar = json.data?.user.contributionsCollection.contributionCalendar;
  if (!calendar) {
    throw new Error("No contribution calendar returned for user " + login);
  }

  return {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((w) => ({
      days: w.contributionDays.map((d) => ({
        date: d.date,
        contributionCount: d.contributionCount,
        contributionLevel: d.contributionLevel,
        weekday: d.weekday,
      })),
    })),
  };
}
