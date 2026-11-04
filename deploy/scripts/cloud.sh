#!/usr/bin/env bash
# Starts and stops the EC2 instance, so it only costs money while someone uses it.
# A stopped instance keeps its disk, its data and its address; k3s and every pod come back by
# themselves after a start, which takes about two minutes.
#
#   deploy/scripts/cloud.sh start | stop | status
set -euo pipefail

cd "$(dirname "$0")/../terraform"
export AWS_PROFILE="${AWS_PROFILE:-relay}" AWS_PAGER=""
# The profile's default region can be another one; the instance lives where terraform put it.
AWS_REGION="$(terraform output -raw region)"
export AWS_REGION

# The SSO login lasts a few hours; say how to renew it instead of showing the CLI's error.
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "The AWS login has expired. Run: aws sso login --profile $AWS_PROFILE" >&2
  exit 1
fi

instance="$(terraform output -raw instance_id)"
url="http://$(terraform output -raw hostname)"

case "${1:-status}" in
  start)
    aws ec2 start-instances --instance-ids "$instance" >/dev/null
    aws ec2 wait instance-running --instance-ids "$instance"
    echo "Running. Relay is back in about two minutes on $url"
    ;;
  stop)
    aws ec2 stop-instances --instance-ids "$instance" >/dev/null
    aws ec2 wait instance-stopped --instance-ids "$instance"
    echo "Stopped. Only the disk and the address cost money now."
    ;;
  status)
    state="$(aws ec2 describe-instances --instance-ids "$instance" --query 'Reservations[0].Instances[0].State.Name' --output text)"
    echo "$instance is $state ($url)"
    ;;
  *)
    echo "usage: $0 start | stop | status" >&2
    exit 2
    ;;
esac
