import mailchimp from '@mailchimp/mailchimp_marketing';
import { createHash } from 'crypto';
import { mailchimpApiKey, mailchimpAudienceId, mailchimpServerPrefix } from 'src/utils/constants';
import { Logger } from '../../logger/logger';
import {
  ListMember,
  ListMemberPartial,
  MAILCHIMP_CUSTOM_EVENTS,
  MAILCHIMP_MERGE_FIELD_TYPES,
  UpdateListMemberRequest,
} from './mailchimp-api.interfaces';

const logger = new Logger('MailchimpAPI');

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServerPrefix,
});

export function getEmailMD5Hash(email: string) {
  return createHash('md5').update(email).digest('hex');
}

export async function ping() {
  const response = await mailchimp.ping.get();
  console.log(response);
}

export const createMailchimpProfile = async (
  profileData: Partial<UpdateListMemberRequest>,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.addListMember(mailchimpAudienceId, profileData);
  } catch (error) {
    throw new Error(`Create mailchimp profile API call failed: ${error}`);
  }
};

export const batchCreateMailchimpProfiles = async (
  userProfiles: Partial<UpdateListMemberRequest>[],
) => {
  try {
    const operations = [];

    userProfiles.forEach((userProfile, index) => {
      operations.push({
        method: 'POST',
        path: `/lists/${mailchimpAudienceId}/members`,
        operation_id: index,
        body: JSON.stringify(userProfile),
      });
    });

    const batchRequest = await mailchimp.batches.start({
      operations: operations,
    });
    console.log('Mailchimp batch request:', batchRequest);
    console.log('Wait 2 minutes before calling response...');

    setTimeout(async () => {
      const batchResponse = await mailchimp.batches.status(batchRequest.id);
      console.log('Mailchimp batch response:', batchResponse);
    }, 120000);
  } catch (error) {
    throw new Error(`Batch create mailchimp profiles API call failed: ${error}`);
  }
};

// Note getMailchimpProfile is not currently used
export const getMailchimpProfile = async (email: string): Promise<ListMember> => {
  try {
    return await mailchimp.lists.getListMember(mailchimpAudienceId, getEmailMD5Hash(email));
  } catch (error) {
    throw new Error(`Get mailchimp profile API call failed: ${error}`);
  }
};

export const updateMailchimpProfile = async (
  newProfileData: ListMemberPartial,
  email: string,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.updateListMember(
      mailchimpAudienceId,
      getEmailMD5Hash(email),
      newProfileData,
    );
  } catch (error) {
    throw new Error(`Update mailchimp profile API call failed: ${error}`);
  }
};

export const createMailchimpMergeField = async (
  name: string,
  tag: string,
  type: MAILCHIMP_MERGE_FIELD_TYPES,
): Promise<ListMember> => {
  try {
    return await mailchimp.lists.addListMergeField(mailchimpAudienceId, {
      name,
      tag,
      type,
      required: false,
    });
  } catch (error) {
    throw new Error(`Create mailchimp merge field API call failed: ${error}`);
  }
};

export const deleteMailchimpProfile = async (email: string) => {
  try {
    return await mailchimp.lists.deleteListMember(mailchimpAudienceId, getEmailMD5Hash(email));
  } catch (error) {
    logger.warn(`Delete mailchimp profile API call failed: ${error}`);
  }
};

export const deleteCypressMailchimpProfiles = async () => {
  try {
    const cypressProfiles = (await mailchimp.lists.getSegmentMembersList(
      mailchimpAudienceId,
      '5101590',
    )) as { members: ListMember[] };

    cypressProfiles.members.forEach(async (profile: ListMember) => {
      deleteMailchimpProfile(profile.email_address);
    });
  } catch (error) {
    throw new Error(`Delete cypress mailchimp profiles API call failed: ${error}`);
  }
};

export const sendMailchimpUserEvent = async (email: string, event: MAILCHIMP_CUSTOM_EVENTS) => {
  try {
    await mailchimp.lists.createListMemberEvent(mailchimpAudienceId, getEmailMD5Hash(email), {
      name: event,
    });
  } catch (error) {
    throw new Error(`Send mailchimp user event failed: ${error}`);
  }
};
