import { governanceABI } from '@celo/abis';
import { Addresses } from 'src/config/contracts';
import {
  OrderedVoteValue,
  UpvoteFormValues,
  UpvoteRecord,
  VoteFormValues,
} from 'src/features/governance/types';
import { TxPlan } from 'src/features/transactions/types';
import { logger } from 'src/utils/logger';
import { deepCopy } from 'src/utils/objects';

export function getVoteTxPlan(values: VoteFormValues, dequeued: number[]): TxPlan {
  const { proposalId, vote } = values;
  const proposalIndex = dequeued.indexOf(proposalId);
  const voteInt = OrderedVoteValue.indexOf(vote);

  if (proposalIndex < 0) {
    logger.error(`No proposal index found for: ${proposalId}`);
    return [];
  }

  return [
    {
      action: 'vote',
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'vote',
      args: [proposalId, proposalIndex, voteInt],
    },
  ];
}

export function getUpvoteTxPlan(
  { proposalId }: UpvoteFormValues,
  queue: UpvoteRecord[],
  votingPower: bigint,
): TxPlan {
  const { lesserID, greaterID } = lesserAndGreaterAfterUpvote(proposalId, queue, votingPower);

  return [
    {
      action: 'upvote',
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'upvote',
      args: [proposalId, lesserID, greaterID],
    },
  ];
}

// Based on https://github.com/celo-org/developer-tooling/blob/ae51ca8851e6684d372f976dd8610ddf502a266b/packages/sdk/contractkit/src/wrappers/Governance.ts#L765
function lesserAndGreaterAfterUpvote(
  proposalId: number,
  queue: UpvoteRecord[],
  votingPower: bigint,
): { lesserID: number; greaterID: number } {
  const proposalIndex = queue.findIndex((p) => p.proposalId === proposalId);
  const newQueue = deepCopy(queue);
  newQueue[proposalIndex].upvotes += votingPower;
  newQueue.sort((a, b) => (a.upvotes > b.upvotes ? 1 : -1));
  const newIndex = newQueue.findIndex((p) => p.proposalId === proposalId);
  return {
    lesserID: newIndex === 0 ? 0 : newQueue[newIndex - 1].proposalId,
    greaterID: newIndex === queue.length - 1 ? 0 : newQueue[newIndex + 1].proposalId,
  };
}