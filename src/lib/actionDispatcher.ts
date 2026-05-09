import { DeliveryRisk } from "@prisma/client";
import { db } from "./db";

// Simulated Action Dispatcher

export async function dispatchEmail(riskId: string, emailBody: string, toAddress: string) {
  // Try to find risk
  const risk = await db.deliveryRisk.findUnique({ where: { id: riskId } });
  if (!risk) throw new Error("Risk not found");

  // In a real app, this would use Gmail API `messages.send` using the stored OAuth token
  // For the hackathon, we record the execution to DB.
  
  const execution = await db.actionExecution.create({
    data: {
      riskId,
      type: "email",
      status: "success",
      externalUrl: "https://mail.google.com/mail/u/0/#sent"
    }
  });

  return execution;
}

export async function dispatchSlackMessage(riskId: string, messageBody: string, channel: string) {
  const risk = await db.deliveryRisk.findUnique({ where: { id: riskId } });
  if (!risk) throw new Error("Risk not found");

  const execution = await db.actionExecution.create({
    data: {
      riskId,
      type: "slack",
      status: "success",
      externalUrl: "slack://channel?team=T0123&id=C0123"
    }
  });

  return execution;
}

export async function createGitHubIssue(riskId: string, title: string, body: string, repo: string) {
  const risk = await db.deliveryRisk.findUnique({ where: { id: riskId } });
  if (!risk) throw new Error("Risk not found");

  const execution = await db.actionExecution.create({
    data: {
      riskId,
      type: "github_issue",
      status: "success",
      externalUrl: `https://github.com/${repo}/issues/1`
    }
  });

  return execution;
}
