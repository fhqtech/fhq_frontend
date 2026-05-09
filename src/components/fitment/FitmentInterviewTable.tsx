import { useNavigate } from "react-router-dom";
import { DotsThree as MoreHorizontal, Eye, Download, Target, CircleNotch } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, Status } from "@/components/dashboard/StatusBadge";
import { FitmentInterview } from "@/services/fitmentInterviewApi";

interface FitmentInterviewTableProps {
  fitmentInterviews: FitmentInterview[];
  isLoading: boolean;
  onCreateNew: () => void;
}

export function FitmentInterviewTable({
  fitmentInterviews,
  isLoading,
  onCreateNew
}: FitmentInterviewTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12">
            <CircleNotch className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500 uppercase tracking-wider">Loading fitment interviews...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fitmentInterviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 uppercase tracking-wider">No Fitment Interviews</h3>
            <p className="text-gray-500 mb-4 uppercase text-xs tracking-wider">Create your first fitment interview to get started.</p>
            <Button
              onClick={onCreateNew}
              className="text-white font-medium rounded-sm uppercase transition-all duration-200"
              style={{
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#222831',
                boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                textTransform: 'uppercase'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
            >
              Create Fitment Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Title</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-wider">Candidates</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Linked Interviews</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Completion Rate</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fitmentInterviews.map((interview) => (
              <TableRow
                key={interview.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/fitment-interviews/${interview.id}`)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium uppercase tracking-wider">{interview.title}</div>
                    <div className="text-sm text-gray-500">ID: {interview.id.slice(0, 8)}...</div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={interview.status as Status} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium">{interview.candidateCount}</div>
                </TableCell>
                <TableCell>
                  {interview.parentInterviews && interview.parentInterviews.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {interview.parentInterviews.slice(0, 3).map((parent, index) => (
                        <div key={index} className="bg-gray-100 border px-2 py-1 rounded text-left min-w-0 max-w-32">
                          <div className="font-medium text-xs truncate">{parent.interviewTitle}</div>
                          <div className="text-xs text-gray-500">{parent.interviewId.slice(0, 6)}...</div>
                        </div>
                      ))}
                      {interview.parentInterviews.length > 3 && (
                        <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded flex items-center">
                          <span className="text-xs text-blue-700 font-medium">+{interview.parentInterviews.length - 3} more</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No linked interviews</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">0%</div>
                  <div className="text-sm text-gray-500">0 of {interview.candidateCount} completed</div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="uppercase text-xs tracking-wider">Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="uppercase text-xs tracking-wider">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="uppercase text-xs tracking-wider">
                        <Download className="w-4 h-4 mr-2" />
                        Export Results
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
