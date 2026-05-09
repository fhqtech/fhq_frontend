import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EmailTemplatePreview = () => {
  const [candidateName, setCandidateName] = useState('Harris Mohammed');
  const [interviewTitle, setInterviewTitle] = useState('junior');
  const [interviewType, setInterviewType] = useState('screening');
  const [interviewDuration, setInterviewDuration] = useState('30');
  const [companyName, setCompanyName] = useState('Flowdot AI');
  const [invitationUrl, setInvitationUrl] = useState('http://localhost:8080/register/nR1rMKH1AKR81XwekkNVt2BU2MBIYKLC7i960NYD3Vg');

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ${companyName}
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                                You're Invited to Interview!
                            </h2>

                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Hi ${candidateName},
                            </p>

                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                We're excited to invite you to participate in our <strong>${interviewTitle.toUpperCase()}</strong> interview process.
                                This AI-powered interview will help us better understand your skills and experience.
                            </p>

                            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
                                <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px; font-weight: 600;">
                                    Interview Details:
                                </p>
                                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                                    <strong>Position:</strong> ${interviewTitle.toUpperCase()}<br>
                                    <strong>Type:</strong> ${interviewType.charAt(0).toUpperCase() + interviewType.slice(1).toLowerCase()}<br>
                                    <strong>Format:</strong> AI-Powered Interview<br>
                                    <strong>Duration:</strong> Approximately ${interviewDuration} minutes
                                </p>
                            </div>

                            <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                Click the button below to start your interview at your convenience:
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="${invitationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Start Your Interview
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:<br>
                                <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">
                                    ${invitationUrl}
                                </a>
                            </p>

                            <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                We look forward to learning more about you!
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                                This is an automated email from ${companyName}.<br>
                                Please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Email Template Preview - Prelims</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Dynamic Content</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="candidateName">Candidate Name</Label>
                <Input
                  id="candidateName"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="interviewTitle">Interview Title</Label>
                <Input
                  id="interviewTitle"
                  value={interviewTitle}
                  onChange={(e) => setInterviewTitle(e.target.value)}
                  placeholder="Senior Accountant Position"
                />
              </div>

              <div>
                <Label htmlFor="interviewType">Interview Type</Label>
                <Input
                  id="interviewType"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  placeholder="Accounting"
                />
              </div>

              <div>
                <Label htmlFor="interviewDuration">Duration (minutes)</Label>
                <Input
                  id="interviewDuration"
                  value={interviewDuration}
                  onChange={(e) => setInterviewDuration(e.target.value)}
                  placeholder="30"
                />
              </div>

              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Flowdot AI"
                />
              </div>

              <div>
                <Label htmlFor="invitationUrl">Invitation URL</Label>
                <Input
                  id="invitationUrl"
                  value={invitationUrl}
                  onChange={(e) => setInvitationUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <Button
                onClick={() => {
                  setCandidateName('Harris Mohammed');
                  setInterviewTitle('junior');
                  setInterviewType('screening');
                  setInterviewDuration('30');
                  setCompanyName('Flowdot AI');
                  setInvitationUrl('http://localhost:8080/register/nR1rMKH1AKR81XwekkNVt2BU2MBIYKLC7i960NYD3Vg');
                }}
                variant="outline"
                className="w-full"
              >
                Reset to Real Data
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-4">
              <h2 className="text-xl font-semibold mb-4">Email Preview</h2>
              <p className="text-sm text-gray-600 mb-4">
                Subject: Interview Invitation - {interviewTitle}
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg border">
              <iframe
                srcDoc={htmlTemplate}
                className="w-full bg-white rounded"
                style={{ height: '800px', border: 'none' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
